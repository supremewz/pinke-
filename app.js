const updateManager = require('./utils/updateManager');
const subpackageManager = require('./utils/subpackageManager');
// 引用公共工具，供分包使用（避免代码质量扫描误报）
const util = require('./utils/util');
const serviceManager = require('./utils/serviceManager');
// 引用腾讯地图SDK，供地图相关功能使用
const QQMapWX = require('./utils/qqmap-wx-jssdk.min.js');

App({
  onLaunch: function () {
    console.log('亲子活动拼团小程序启动');

    // 初始化全局数据
    this.globalData = {
      userInfo: {
        isLogin: false,
        isTeacher: false,
        nickname: '',
        avatar: '',
        userId: ''
      },
      location: {
        latitude: null,
        longitude: null,
        address: ''
      },
      systemInfo: null,
      subpackageManager: null
    };

    // 初始化分包管理器
    this.initSubpackageManager();

    // 获取系统信息
    this.getSystemInfo();

    // 检查并恢复登录状态
    try {
      this.checkAndRestoreLoginState();
    } catch (error) {
      console.error('调用checkAndRestoreLoginState失败:', error);
      console.log('跳过登录状态恢复');
    }

    // 启动时预加载核心分包
    this.preloadCoreSubpackages();
  },

  onShow: function () {
    updateManager();

    // 应用显示时预加载常用分包
    this.preloadCommonSubpackages();
  },

  // 初始化分包管理器
  initSubpackageManager() {
    try {
      this.globalData.subpackageManager = subpackageManager;
      console.log('✅ 分包管理器初始化成功');
    } catch (error) {
      console.error('❌ 分包管理器初始化失败:', error);
    }
  },

  // 预加载核心分包
  preloadCoreSubpackages() {
    if (!this.globalData.subpackageManager) return;

    try {
      // 预加载用户分包（高优先级）
      this.globalData.subpackageManager.preloadSubpackage('user', 'high');
      console.log('✅ 开始预加载用户分包');
    } catch (error) {
      console.error('❌ 预加载核心分包失败:', error);
    }
  },

  // 预加载常用分包
  preloadCommonSubpackages() {
    if (!this.globalData.subpackageManager) return;

    try {
      // 根据网络状态决定预加载策略
      wx.getNetworkType({
        success: (res) => {
          const networkType = res.networkType;

          if (networkType === 'wifi') {
            // WiFi环境下预加载更多分包
            this.globalData.subpackageManager.preloadSubpackage('courses', 'medium');
            this.globalData.subpackageManager.preloadSubpackage('group', 'medium');
            this.globalData.subpackageManager.preloadSubpackage('components', 'low');
            console.log('✅ WiFi环境，预加载更多分包');
          } else if (networkType === '4g' || networkType === '5g') {
            // 移动网络下只预加载必要分包
            this.globalData.subpackageManager.preloadSubpackage('courses', 'low');
            console.log('✅ 移动网络，预加载必要分包');
          }
        },
        fail: (error) => {
          console.error('❌ 获取网络状态失败:', error);
          // 默认预加载策略
          this.globalData.subpackageManager.preloadSubpackage('courses', 'low');
        }
      });
    } catch (error) {
      console.error('❌ 预加载常用分包失败:', error);
    }
  },

  // 获取系统信息
  getSystemInfo() {
    try {
      // 使用新的 API 替代已弃用的 wx.getSystemInfo
      const deviceInfo = wx.getDeviceInfo();
      const windowInfo = wx.getWindowInfo();
      const appBaseInfo = wx.getAppBaseInfo();

      // 合并系统信息
      const systemInfo = {
        ...deviceInfo,
        ...windowInfo,
        ...appBaseInfo
      };

      this.globalData.systemInfo = systemInfo;
      console.log('系统信息:', systemInfo);
    } catch (error) {
      console.error('获取系统信息失败:', error);
      // 降级处理，使用旧 API
      wx.getSystemInfo({
        success: (res) => {
          this.globalData.systemInfo = res;
          console.log('系统信息(降级):', res);
        },
        fail: (err) => {
          console.error('获取系统信息失败:', err);
        }
      });
    }
  },

  // 获取用户位置（已废弃 - 改用 wx.chooseLocation 让用户主动选择）
  // getUserLocation() {
  //   return new Promise((resolve, reject) => {
  //     wx.getLocation({
  //       type: 'gcj02',
  //       success: (res) => {
  //         this.globalData.location = {
  //           latitude: res.latitude,
  //           longitude: res.longitude,
  //           address: ''
  //         };
  //         resolve(res);
  //       },
  //       fail: reject
  //     });
  //   });
  // },

  // 检查并恢复登录状态
  checkAndRestoreLoginState() {
    try {
      console.log('🔍 检查登录状态...');

      // 获取本地存储的用户信息和token
      const userToken = wx.getStorageSync('userToken');
      const userInfo = wx.getStorageSync('userInfo');

      if (userToken && userInfo) {
        console.log('✅ 发现本地登录信息，恢复登录状态');
        console.log('用户信息:', userInfo);
        console.log('Token前缀:', userToken.substring(0, 10) + '...');

        // 恢复全局登录状态
        this.globalData.userInfo = {
          isLogin: true,
          isTeacher: userInfo.user_type === 'teacher',
          nickname: userInfo.nickname || '',
          avatar: userInfo.avatar || '',
          userId: userInfo.id || userInfo.userId || '',
          ...userInfo
        };
        this.globalData.userToken = userToken;

        console.log('✅ 登录状态已恢复');

        // 可选：验证token有效性（异步，不阻塞启动）
        this.validateTokenAsync(userToken, userInfo);
      } else {
        console.log('⚠️ 未发现本地登录信息');
        this.globalData.userInfo.isLogin = false;
      }
    } catch (error) {
      console.error('❌ 检查登录状态失败:', error);
      this.globalData.userInfo.isLogin = false;
    }
  },

  // 异步验证token有效性
  validateTokenAsync(token, userInfo) {
    try {
      // 这里可以调用后端API验证token，但不能阻塞小程序启动
      // 简单的本地验证：检查token过期时间
      const tokenExpiry = wx.getStorageSync('tokenExpiry');
      if (tokenExpiry && Date.now() > tokenExpiry) {
        console.log('⚠️ Token已过期，清除本地数据');
        this.clearLoginState();
        return;
      }

      console.log('✅ Token本地验证通过');

      // 可以在这里发起后端验证请求，但要处理好错误情况
      // 避免因网络问题影响用户体验
    } catch (error) {
      console.error('❌ Token验证失败:', error);
      // 验证失败不清除登录状态，避免因网络问题导致用户频繁登录
    }
  },

  // 清除登录状态
  clearLoginState() {
    try {
      wx.removeStorageSync('userToken');
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('tokenExpiry');
      wx.removeStorageSync('isNewUser');

      this.globalData.userInfo = {
        isLogin: false,
        isTeacher: false,
        nickname: '',
        avatar: '',
        userId: ''
      };
      this.globalData.userToken = null;

      console.log('✅ 登录状态已清除');
    } catch (error) {
      console.error('❌ 清除登录状态失败:', error);
    }
  },

  // 全局数据
  globalData: {}
});
