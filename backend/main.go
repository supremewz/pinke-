package main

import (
	"flag"
	"log"
	"os"

	"pinke-backend/internal/config"
	"pinke-backend/internal/database"
	"pinke-backend/internal/router"
	"pinke-backend/internal/task"
	"pinke-backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 解析命令行参数
	configPath := flag.String("config", "", "配置文件路径 (例如: ./config/production.yaml)")
	flag.Parse()

	// 如果指定了配置文件路径，设置环境变量
	if *configPath != "" {
		log.Printf("使用指定的配置文件: %s", *configPath)
		os.Setenv("CONFIG_PATH", *configPath)
	}

	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// 初始化日志
	logger.InitLogger()

	// 加载配置
	cfg, err := config.LoadConfigWithEnvironment()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化数据库
	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// 自动迁移数据库表
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// 设置Gin模式
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 初始化任务管理器
	taskManager := task.NewTaskManager(db, cfg)
	
	// 注册任务
	taskManager.RegisterTask(task.NewPaymentTask(db, cfg))
	taskManager.RegisterTask(task.NewRefundTask(db, cfg))
	taskManager.RegisterTask(task.NewGroupTask(db, cfg))
	
	// 启动任务管理器
	taskManager.Start()
	defer taskManager.Stop()

	// 初始化路由
	r := router.SetupRouter(db, cfg)

	// 启动服务器
	port := cfg.Server.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
