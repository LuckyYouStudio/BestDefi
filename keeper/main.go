package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/sirupsen/logrus"
)

type Keeper struct {
	client       *ethclient.Client
	privateKey   *ecdsa.PrivateKey
	auth         *bind.TransactOpts
	vaultAddress common.Address
	logger       *logrus.Logger
}

func NewKeeper() (*Keeper, error) {
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("Warning: .env file not found")
	}

	rpcURL := os.Getenv("GOERLI_RPC_URL")
	if rpcURL == "" {
		return nil, fmt.Errorf("GOERLI_RPC_URL not set")
	}

	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum client: %v", err)
	}

	privateKeyStr := os.Getenv("KEEPER_PRIVATE_KEY")
	if privateKeyStr == "" {
		privateKeyStr = os.Getenv("PRIVATE_KEY")
	}
	if privateKeyStr == "" {
		return nil, fmt.Errorf("KEEPER_PRIVATE_KEY not set")
	}

	privateKey, err := crypto.HexToECDSA(privateKeyStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %v", err)
	}

	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get network ID: %v", err)
	}

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return nil, fmt.Errorf("failed to create transactor: %v", err)
	}

	logger := logrus.New()
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
	})

	vaultAddressStr := os.Getenv("VAULT_ADDRESS")
	if vaultAddressStr == "" {
		deploymentFile := "../deployment.json"
		if _, err := os.Stat(deploymentFile); err == nil {
			logger.Info("Reading vault address from deployment.json")
		} else {
			return nil, fmt.Errorf("VAULT_ADDRESS not set and deployment.json not found")
		}
	}

	return &Keeper{
		client:       client,
		privateKey:   privateKey,
		auth:         auth,
		vaultAddress: common.HexToAddress(vaultAddressStr),
		logger:       logger,
	}, nil
}

func (k *Keeper) checkAndHarvest() {
	ctx := context.Background()
	
	k.logger.Info("Checking harvest conditions...")

	gasPrice, err := k.client.SuggestGasPrice(ctx)
	if err != nil {
		k.logger.Errorf("Failed to get gas price: %v", err)
		return
	}

	maxGasPrice := big.NewInt(100000000000) // 100 Gwei
	if gasPrice.Cmp(maxGasPrice) > 0 {
		k.logger.Warnf("Gas price too high: %s Gwei", new(big.Int).Div(gasPrice, big.NewInt(1e9)))
		return
	}

	vaultABI := `[{"name":"harvest","type":"function","inputs":[],"outputs":[]},{"name":"balance","type":"function","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},{"name":"lastHarvest","type":"function","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"}]`
	
	metadata := &bind.MetaData{ABI: vaultABI}
	parsedABI, err := metadata.GetAbi()
	if err != nil {
		k.logger.Errorf("Failed to parse ABI: %v", err)
		return
	}

	vaultContract := bind.NewBoundContract(k.vaultAddress, *parsedABI, k.client, k.client, k.client)

	var lastHarvest *big.Int
	results := []interface{}{&lastHarvest}
	err = vaultContract.Call(nil, &results, "lastHarvest")
	if err != nil {
		k.logger.Errorf("Failed to get last harvest time: %v", err)
		return
	}

	timeSinceLastHarvest := time.Now().Unix() - lastHarvest.Int64()
	minInterval := int64(3600) // 1 hour
	
	if timeSinceLastHarvest < minInterval {
		k.logger.Infof("Too soon to harvest. Last harvest was %d seconds ago", timeSinceLastHarvest)
		return
	}

	var balance *big.Int
	results = []interface{}{&balance}
	err = vaultContract.Call(nil, &results, "balance")
	if err != nil {
		k.logger.Errorf("Failed to get vault balance: %v", err)
		return
	}

	minBalance := big.NewInt(1000000000) // 1000 USDC
	if balance.Cmp(minBalance) < 0 {
		k.logger.Infof("Vault balance too low: %s", balance.String())
		return
	}

	k.logger.Info("Conditions met, executing harvest...")
	
	k.auth.GasPrice = gasPrice
	k.auth.GasLimit = uint64(500000)

	tx, err := vaultContract.Transact(k.auth, "harvest")
	if err != nil {
		k.logger.Errorf("Failed to send harvest transaction: %v", err)
		return
	}

	k.logger.Infof("Harvest transaction sent: %s", tx.Hash().Hex())

	receipt, err := bind.WaitMined(ctx, k.client, tx)
	if err != nil {
		k.logger.Errorf("Failed to wait for transaction: %v", err)
		return
	}

	if receipt.Status == 1 {
		k.logger.Infof("Harvest successful! Gas used: %d", receipt.GasUsed)
	} else {
		k.logger.Error("Harvest transaction failed")
	}
}

func (k *Keeper) Run() {
	k.logger.Info("Starting Keeper service...")
	k.logger.Infof("Vault address: %s", k.vaultAddress.Hex())
	
	address := crypto.PubkeyToAddress(k.privateKey.PublicKey)
	k.logger.Infof("Keeper address: %s", address.Hex())

	balance, err := k.client.BalanceAt(context.Background(), address, nil)
	if err == nil {
		ethBalance := new(big.Float).Quo(new(big.Float).SetInt(balance), big.NewFloat(1e18))
		k.logger.Infof("ETH balance: %s", ethBalance.String())
	}

	c := cron.New()
	
	schedule := os.Getenv("HARVEST_SCHEDULE")
	if schedule == "" {
		schedule = "*/15 * * * *" // Every 15 minutes
	}

	_, err = c.AddFunc(schedule, k.checkAndHarvest)
	if err != nil {
		k.logger.Fatalf("Failed to schedule harvest job: %v", err)
	}

	k.checkAndHarvest()

	c.Start()
	k.logger.Infof("Keeper running with schedule: %s", schedule)

	select {}
}

func main() {
	keeper, err := NewKeeper()
	if err != nil {
		log.Fatalf("Failed to initialize keeper: %v", err)
	}

	keeper.Run()
}