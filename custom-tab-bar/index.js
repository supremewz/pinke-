Component({
  data: {
    selected: 0,
    color: '#999999',
    selectedColor: '#8B5CF6',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/home_new',
        text: '首页',
        iconPath: '/images/tabbar/home.png',
        selectedIconPath: '/images/tabbar/home-selected.png'
      },
      {
        pagePath: 'pages/course-list/index',
        text: '拼团',
        iconPath: '/images/tabbar/group.png',
        selectedIconPath: '/images/tabbar/group-selected.png'
      },
      {
        pagePath: 'pages/discover/index',
        text: '活动',
        iconPath: '/images/tabbar/course.png',
        selectedIconPath: '/images/tabbar/course-selected.png'
      },
      {
        pagePath: 'pages/usercenter/index',
        text: '我的',
        iconPath: '/images/tabbar/user.png',
        selectedIconPath: '/images/tabbar/user-selected.png'
      }
    ]
  },

  attached() {
    this.setSelected();
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      const index = data.index;

      console.log('TabBar点击:', { url, index, currentSelected: this.data.selected });

      if (this.data.selected === index) {
        return;
      }

      wx.switchTab({
        url: `/${url}`,
        success: () => {
          console.log('TabBar跳转成功:', url);
          this.setData({
            selected: index
          });
        },
        fail: (error) => {
          console.error('TabBar跳转失败:', error);
        }
      });
    },

    setSelected() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      if (!currentPage) return;
      
      const currentRoute = currentPage.route;
      console.log('当前页面路径:', currentRoute);
      
      const selected = this.data.list.findIndex(item => {
        // 更精确的路径匹配
        const itemPath = item.pagePath;
        return currentRoute === itemPath || 
               currentRoute.replace('/index', '') === itemPath.replace('/index', '');
      });
      
      console.log('匹配的TabBar索引:', selected);
      
      if (selected !== -1) {
        this.setData({
          selected
        });
      }
    },

    init() {
      this.setSelected();
    }
  }
});
