// 响应式系统 JavaScript
class ResponsiveBookingSystem {
  constructor() {
    this.selectedSlots = [];
    this.currentWeekStart = null;
    this.currentDate = null;
    this.isDesktopView = this.detectDevice();
    
    // 预约者颜色管理
    this.userColors = new Map(); // 存储用户名与颜色索引的映射
    this.nextColorIndex = 0; // 下一个可用的颜色索引
    this.maxColors = 16; // 最大颜色数量
    
    // API配置
    this.API_BASE_URL = window.location.hostname === 'iehtian.top' || 
                       window.location.hostname === '120.53.234.45' ? 
                       '' : 'http://127.0.0.1:5000';
    
    // 获取当前系统ID
    this.SYSTEM_ID = this.getCurrentSystemId();
    
    // 初始化
    this.init();
  }
  
  // 检测设备类型
  detectDevice() {
    // 检测用户代理字符串
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'mobile', 'android', 'iphone', 'ipad', 'phone', 'tablet',
      'touch', 'blackberry', 'nokia', 'samsung', 'htc', 'lg',
      'motorola', 'sony', 'xiaomi', 'huawei', 'oppo', 'vivo'
    ];
    
    // 检查是否包含移动设备关键词
    const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
    
    // 检查屏幕尺寸
    const isSmallScreen = window.innerWidth < 1024;
    
    // 检查触摸支持
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // 综合判断：如果用户代理包含移动设备关键词，或者屏幕小且支持触摸，则认为是移动设备
    const isMobile = isMobileUA || (isSmallScreen && isTouchDevice);
    
    console.log('设备检测结果:', {
      userAgent: userAgent,
      isMobileUA,
      isSmallScreen,
      isTouchDevice,
      finalResult: isMobile ? '移动端' : 'PC端'
    });
    
    return !isMobile; // 返回是否为桌面端
  }
  
  getCurrentSystemId() {
    const path = window.location.pathname;
    if (path.includes('a_device')) return 'a_device';
    if (path.includes('b_device')) return 'b_device';
    return 'a_device';
  }

  // 获取用户颜色类
  getUserColorClass(userName) {
    if (!userName) return null;
    
    // 如果用户还没有分配颜色，为其分配一个
    if (!this.userColors.has(userName)) {
      const colorIndex = this.nextColorIndex % this.maxColors;
      this.userColors.set(userName, colorIndex);
      this.nextColorIndex++;
    }
    
    const colorIndex = this.userColors.get(userName);
    return `user-color-${colorIndex}`;
  }
  
  init() {
    this.initElements();
    this.bindEvents();
    this.loadNames();
    this.setDefaultDate();
    
    // 监听窗口大小变化，但只在真正的设备类型改变时切换视图
    window.addEventListener('resize', () => {
      const newIsDesktop = this.detectDevice();
      if (newIsDesktop !== this.isDesktopView) {
        this.isDesktopView = newIsDesktop;
        this.renderBookingInterface();
      }
    });
    
    this.renderBookingInterface();
  }
  
  initElements() {
    this.elements = {
      nameInput: document.getElementById('nameInput'),
      dateInput: document.getElementById('dateInput'),
      submitBtn: document.getElementById('submitBtn'),
      messageDiv: document.getElementById('message'),
      viewBookingsLink: document.getElementById('viewBookingsLink'),
      bookingsModal: document.getElementById('bookingsModal'),
      bookingsTitle: document.getElementById('bookingsTitle'),
      bookingsList: document.getElementById('bookingsList'),
      closeButton: document.querySelector('.close-button'),
      
      // 周视图相关元素
      weekNavigation: document.querySelector('.week-navigation'),
      prevWeekBtn: document.getElementById('prevWeekBtn'),
      nextWeekBtn: document.getElementById('nextWeekBtn'),
      weekRange: document.querySelector('.week-range'),
      
      // 容器元素
      desktopView: document.querySelector('.desktop-view'),
      mobileView: document.querySelector('.mobile-view'),
      weekGrid: document.querySelector('.week-grid'),
      slots: document.getElementById('slots'), // 这是slots-container
      
      // 移动端日期导航
      prevDayBtn: document.getElementById('prevDayBtn'),
      nextDayBtn: document.getElementById('nextDayBtn'),
      mobileDateInput: document.getElementById('mobileDate')
    };
  }
  
  bindEvents() {
    // 提交
    this.elements.submitBtn.addEventListener('click', () => this.submitBooking());
    
    // 日期变化
    this.elements.dateInput.addEventListener('change', () => {
      this.currentDate = this.elements.dateInput.value;
      // 同步移动端日期
      if (this.elements.mobileDateInput) {
        this.elements.mobileDateInput.value = this.currentDate;
      }
      this.selectedSlots = [];
      if (this.isDesktopView) {
        this.updateWeekFromDate();
      } else {
        this.fetchSlots(this.currentDate);
      }
    });
    
    // 移动端日期变化
    if (this.elements.mobileDateInput) {
      this.elements.mobileDateInput.addEventListener('change', () => {
        this.currentDate = this.elements.mobileDateInput.value;
        // 同步PC端日期
        this.elements.dateInput.value = this.currentDate;
        this.selectedSlots = [];
        this.fetchSlots(this.currentDate);
      });
    }
    
    // 周导航
    if (this.elements.prevWeekBtn) {
      this.elements.prevWeekBtn.addEventListener('click', () => this.changeWeek(-1));
    }
    if (this.elements.nextWeekBtn) {
      this.elements.nextWeekBtn.addEventListener('click', () => this.changeWeek(1));
    }
    
    // 移动端日期导航
    if (this.elements.prevDayBtn) {
      this.elements.prevDayBtn.addEventListener('click', () => this.changeDate(-1));
    }
    if (this.elements.nextDayBtn) {
      this.elements.nextDayBtn.addEventListener('click', () => this.changeDate(1));
    }
    
    // 查看情况
    this.elements.viewBookingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showUserBookings();
    });
    
    // 弹窗关闭
    this.elements.closeButton.addEventListener('click', () => {
      this.elements.bookingsModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
      if (e.target === this.elements.bookingsModal) {
        this.elements.bookingsModal.style.display = 'none';
      }
    });
  }
  
  setDefaultDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    this.currentDate = this.formatDate(tomorrow);
    this.elements.dateInput.value = this.currentDate;
    
    // 同步设置移动端日期
    if (this.elements.mobileDateInput) {
      this.elements.mobileDateInput.value = this.currentDate;
    }
    
    if (this.isDesktopView) {
      this.updateWeekFromDate();
    }
  }
  
  updateWeekFromDate() {
    const date = new Date(this.currentDate);
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 获取本周一的偏移量
    
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    
    this.currentWeekStart = monday;
    this.updateWeekRange();
    this.fetchWeekSlots();
  }
  
  changeWeek(direction) {
    const newWeekStart = new Date(this.currentWeekStart);
    newWeekStart.setDate(this.currentWeekStart.getDate() + (direction * 7));
    this.currentWeekStart = newWeekStart;
    
    // 更新当前日期为新周的第一天
    this.currentDate = this.formatDate(newWeekStart);
    this.elements.dateInput.value = this.currentDate;
    
    this.selectedSlots = [];
    this.updateWeekRange();
    this.fetchWeekSlots();
  }
  
  changeDate(direction) {
    const currentDate = new Date(this.currentDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    
    this.currentDate = this.formatDate(newDate);
    this.elements.dateInput.value = this.currentDate;
    
    // 同步设置移动端日期
    if (this.elements.mobileDateInput) {
      this.elements.mobileDateInput.value = this.currentDate;
    }
    
    this.selectedSlots = [];
    this.fetchSlots(this.currentDate);
  }
  
  updateWeekRange() {
    if (!this.elements.weekRange) return;
    
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(this.currentWeekStart.getDate() + 6);
    
    const startStr = this.formatDateChinese(this.currentWeekStart);
    const endStr = this.formatDateChinese(weekEnd);
    
    this.elements.weekRange.textContent = `${startStr} - ${endStr}`;
  }
  
  renderBookingInterface() {
    const container = document.querySelector('.container');
    const viewModeIndicator = document.getElementById('viewMode');
    
    if (this.isDesktopView) {
      container.classList.add('desktop-mode');
      if (viewModeIndicator) {
        viewModeIndicator.textContent = '(PC端周视图)';
      }
      console.log('切换到PC端视图');
      if (this.currentWeekStart) {
        this.fetchWeekSlots();
      } else {
        this.updateWeekFromDate();
      }
    } else {
      container.classList.remove('desktop-mode');
      if (viewModeIndicator) {
        viewModeIndicator.textContent = '(移动端日视图)';
      }
      console.log('切换到移动端视图');
      if (this.currentDate) {
        this.fetchSlots(this.currentDate);
      }
    }
  }
  
  async fetchWeekSlots() {
    const weekDates = this.getWeekDates();
    const weekData = {};
    
    try {
      // 并行获取一周的数据
      const promises = weekDates.map(date => 
        fetch(`${this.API_BASE_URL}/api/slots?date=${date}&system=${this.SYSTEM_ID}`)
          .then(res => res.json())
          .then(data => ({ date, data }))
      );
      
      const results = await Promise.all(promises);
      results.forEach(({ date, data }) => {
        weekData[date] = data;
      });
      
      this.renderWeekGrid(weekData);
    } catch (error) {
      console.error('获取周数据失败:', error);
      this.showMessage('获取数据失败，请检查网络连接', 'error');
    }
  }
  
  getWeekDates() {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      dates.push(this.formatDate(date));
    }
    return dates;
  }
  
  getTimeSlotsFromWeekData(weekData, weekDates) {
    // 从后端返回的数据中获取时间段列表
    // 使用第一个有数据的日期的时间段作为模板
    for (const date of weekDates) {
      const dayData = weekData[date];
      if (dayData && dayData.length > 0) {
        return dayData.map(slot => slot.time);
      }
    }
    // 如果没有数据，返回空数组
    return [];
  }
  
  // 将时间段分组为早晨、工作时间、晚上
  groupTimeSlots(timeSlots) {
    const groups = {
      morning: [], // 00:00 - 08:59
      working: [], // 09:00 - 21:59
      evening: []  // 22:00 - 23:59
    };
    
    timeSlots.forEach(slot => {
      const hour = parseInt(slot.split(':')[0]);
      if (hour < 9) {
        groups.morning.push(slot);
      } else if (hour < 22) {
        groups.working.push(slot);
      } else {
        groups.evening.push(slot);
      }
    });
    
    return groups;
  }
  
  // 创建折叠区域头部
  createCollapseHeader(title, isCollapsed = true) {
    const header = document.createElement('div');
    header.className = `time-collapse-header ${isCollapsed ? 'collapsed' : ''}`;
    
    // 箭头图标
    const expandedIcon = '▼';
    const collapsedIcon = this.isDesktopView ? '◀' : '▲';
    
    header.innerHTML = `
      <span>${title}</span>
      <span class="time-collapse-icon">${isCollapsed ? collapsedIcon : expandedIcon}</span>
    `;
    
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const isCurrentlyCollapsed = header.classList.contains('collapsed');
      const icon = header.querySelector('.time-collapse-icon');
      
      if (isCurrentlyCollapsed) {
        header.classList.remove('collapsed');
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        icon.textContent = expandedIcon;
      } else {
        header.classList.add('collapsed');
        content.classList.add('expanded');
        icon.textContent = collapsedIcon;
        setTimeout(() => {
          content.classList.remove('expanded');
          content.classList.add('collapsed');
        }, 10);
      }
    });
    
    return header;
  }
  
  renderWeekGrid(weekData) {
    if (!this.elements.weekGrid) return;
    
    // 从后端数据中获取时间段（使用第一个有数据的日期的时间段）
    const weekDates = this.getWeekDates();
    const timeSlots = this.getTimeSlotsFromWeekData(weekData, weekDates);
    const groupedSlots = this.groupTimeSlots(timeSlots);
    
    // 清空现有内容
    this.elements.weekGrid.innerHTML = '';
    
    // 添加表头
    const timeHeader = document.createElement('div');
    timeHeader.className = 'time-header';
    timeHeader.textContent = '时间';
    this.elements.weekGrid.appendChild(timeHeader);
    
    const daysHeader = document.createElement('div');
    daysHeader.className = 'days-header';
    
    weekDates.forEach((date, index) => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      
      const dateObj = new Date(date);
      const today = new Date();
      const isToday = this.formatDate(today) === date;
      
      if (isToday) {
        dayHeader.classList.add('today');
      }
      
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayName = dayNames[dateObj.getDay()];
      const monthDay = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      
      dayHeader.innerHTML = `
        <div>${dayName}</div>
        <div style="font-size: 0.8rem; margin-top: 0.25rem;">${monthDay}</div>
      `;
      
      daysHeader.appendChild(dayHeader);
    });
    
    this.elements.weekGrid.appendChild(daysHeader);
    
    // 添加折叠控制按钮
    this.addCollapseControls(groupedSlots);
    
    // 渲染所有时间段，保持原有网格结构
    timeSlots.forEach(timeSlot => {
      // 确定时间段所属的组
      const hour = parseInt(timeSlot.split(':')[0]);
      let groupName = 'working';
      if (hour < 9) {
        groupName = 'morning';
      } else if (hour >= 22) {
        groupName = 'evening';
      }
      
      // 时间标签
      const timeDiv = document.createElement('div');
      timeDiv.className = `time-slot time-group-${groupName}`;
      timeDiv.textContent = timeSlot;
      
      // 默认隐藏早晨和晚间时段
      if (groupName === 'morning' || groupName === 'evening') {
        timeDiv.style.display = 'none';
      }
      
      this.elements.weekGrid.appendChild(timeDiv);
      
      // 该时间段对应的所有天的单元格
      const daySlots = document.createElement('div');
      daySlots.className = `day-slots time-group-${groupName}`;
      
      // 默认隐藏早晨和晚间时段
      if (groupName === 'morning' || groupName === 'evening') {
        daySlots.style.display = 'none';
      }
      
      weekDates.forEach(date => {
        const slotCell = document.createElement('div');
        slotCell.className = 'slot-cell';
        
        const dayData = weekData[date] || [];
        const slotData = dayData.find(slot => slot.time === timeSlot);
        
        if (slotData) {
          if (slotData.booked) {
            slotCell.classList.add('booked');
            // 添加用户颜色类
            const userColorClass = this.getUserColorClass(slotData.name);
            if (userColorClass) {
              slotCell.classList.add(userColorClass);
            }
            slotCell.innerHTML = `
              <div class="time-text">${timeSlot}</div>
              <div class="booked-by">${slotData.name}</div>
            `;
          } else {
            slotCell.classList.add('available');
            slotCell.innerHTML = `<div class="time-text">${timeSlot}</div>`;
            
            const slotKey = `${date}_${timeSlot}`;
            if (this.selectedSlots.includes(slotKey)) {
              slotCell.classList.add('selected');
            }
            
            slotCell.addEventListener('click', () => {
              this.toggleWeekSlot(date, timeSlot, slotCell);
            });
          }
        }
        
        daySlots.appendChild(slotCell);
      });
      
      this.elements.weekGrid.appendChild(daySlots);
    });
  }
  
  addCollapseControls(groupedSlots) {
    // 创建控制区域
    const controlsRow = document.createElement('div');
    controlsRow.className = 'week-controls-row';
    controlsRow.style.cssText = 'grid-column: 1 / -1; padding: 0.5rem; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 0.5rem; flex-wrap: wrap;';
    
    if (groupedSlots.morning.length > 0) {
      controlsRow.appendChild(this.createToggleButton('早晨时段 (00:00-08:59)', 'morning', true));
    }
    
    if (groupedSlots.working.length > 0) {
      controlsRow.appendChild(this.createToggleButton('工作时段 (09:00-21:59)', 'working', false));
    }
    
    if (groupedSlots.evening.length > 0) {
      controlsRow.appendChild(this.createToggleButton('晚间时段 (22:00-23:59)', 'evening', true));
    }
    
    this.elements.weekGrid.appendChild(controlsRow);
  }
  
  createToggleButton(title, group, isCollapsed) {
    const btn = document.createElement('button');
    btn.className = `time-group-toggle ${isCollapsed ? '' : 'active'}`;
    btn.textContent = `${isCollapsed ? '▶' : '▼'} ${title}`;
    
    btn.addEventListener('click', () => {
      const rows = this.elements.weekGrid.querySelectorAll(`.time-group-${group}`);
      const isCurrentlyHidden = rows[0]?.style.display === 'none';
      
      rows.forEach(row => {
        row.style.display = isCurrentlyHidden ? '' : 'none';
      });
      
      btn.textContent = `${isCurrentlyHidden ? '▼' : '▶'} ${title}`;
      btn.classList.toggle('active', isCurrentlyHidden);
    });
    
    return btn;
  }
  
  toggleWeekSlot(date, timeSlot, element) {
    const slotKey = `${date}_${timeSlot}`;
    const index = this.selectedSlots.indexOf(slotKey);
    
    if (index > -1) {
      this.selectedSlots.splice(index, 1);
      element.classList.remove('selected');
    } else {
      this.selectedSlots.push(slotKey);
      element.classList.add('selected');
    }
  }
  
  async fetchSlots(date) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/slots?date=${date}&system=${this.SYSTEM_ID}`);
      const data = await response.json();
      this.renderMobileSlots(data);
    } catch (error) {
      console.error('获取时间段失败:', error);
      this.showMessage('获取时间段失败，请检查网络连接', 'error');
    }
  }
  
  renderMobileSlots(slots) {
    if (!this.elements.slots) return;
    
    this.elements.slots.innerHTML = '';
    
    // 将时间段分组
    const timeSlots = slots.map(slot => slot.time);
    const groupedSlots = this.groupTimeSlots(timeSlots);
    
    // 创建垂直分组容器
    const verticalContainer = document.createElement('div');
    verticalContainer.className = 'mobile-vertical-groups';
    
    // 分别创建三个垂直分组
    const groups = [
      { title: '早晨时段 (00:00-08:59)', times: groupedSlots.morning, className: 'morning-group', defaultCollapsed: true },
      { title: '工作时段 (09:00-21:59)', times: groupedSlots.working, className: 'working-group', defaultCollapsed: false },
      { title: '晚间时段 (22:00-23:59)', times: groupedSlots.evening, className: 'evening-group', defaultCollapsed: true }
    ];
    
    groups.forEach(group => {
      if (group.times.length === 0) return;
      
      // 创建分组
      const groupSection = document.createElement('div');
      groupSection.className = `mobile-time-group ${group.className}`;
      
      // 创建标题栏（可点击折叠）
      const titleBar = document.createElement('div');
      titleBar.className = `mobile-time-group-title ${group.defaultCollapsed ? 'collapsed' : ''}`;
      
      // 添加折叠图标和标题文本
      titleBar.innerHTML = `
        <span>${group.title}</span>
        <span class="mobile-collapse-icon">${group.defaultCollapsed ? '▼' : '▲'}</span>
      `;
      
      groupSection.appendChild(titleBar);
      
      // 创建时间槽容器
      const slotsContainer = document.createElement('div');
      slotsContainer.className = `slots ${group.defaultCollapsed ? 'collapsed' : ''}`;
      
      // 添加时间槽按钮
      group.times.sort().forEach(timeSlot => {
        const slotData = slots.find(slot => slot.time === timeSlot);
        if (!slotData) return;
        
        const btn = document.createElement('button');
        btn.textContent = slotData.booked ? `${slotData.time}\n${slotData.name}` : slotData.time;
        btn.title = slotData.booked ? `${slotData.time} - ${slotData.name}` : slotData.time;
        btn.className = 'slot-button';
        
        if (slotData.booked) {
          btn.classList.add('booked');
          // 添加用户颜色类
          const userColorClass = this.getUserColorClass(slotData.name);
          if (userColorClass) {
            btn.classList.add(userColorClass);
          }
          btn.disabled = true;
        } else {
          btn.addEventListener('click', () => this.toggleMobileSlot(slotData.time, btn));
        }
        
        if (this.selectedSlots.includes(slotData.time)) {
          btn.classList.add('selected');
        }
        
        slotsContainer.appendChild(btn);
      });
      
      // 添加折叠点击事件
      titleBar.addEventListener('click', () => {
        const isCollapsed = slotsContainer.classList.contains('collapsed');
        const icon = titleBar.querySelector('.mobile-collapse-icon');
        
        if (isCollapsed) {
          // 展开
          slotsContainer.classList.remove('collapsed');
          titleBar.classList.remove('collapsed');
          icon.textContent = '▲';
        } else {
          // 折叠
          slotsContainer.classList.add('collapsed');
          titleBar.classList.add('collapsed');
          icon.textContent = '▼';
        }
      });
      
      groupSection.appendChild(slotsContainer);
      verticalContainer.appendChild(groupSection);
    });
    
    this.elements.slots.appendChild(verticalContainer);
  }
  
  // 注：此方法已被renderMobileSlots方法取代，删除冗余代码
  
  toggleMobileSlot(time, button) {
    const index = this.selectedSlots.indexOf(time);
    if (index > -1) {
      this.selectedSlots.splice(index, 1);
      button.classList.remove('selected');
    } else {
      this.selectedSlots.push(time);
      button.classList.add('selected');
    }
    console.log('当前选择的时间段:', this.selectedSlots);
  }
  
  async submitBooking() {
    const name = this.elements.nameInput.value;
    
    if (!name || this.selectedSlots.length === 0) {
      this.showMessage('请填写所有信息', 'error');
      return;
    }
    
    // 保存用户选择的姓名
    this.setCookie(`${this.SYSTEM_ID}_userName`, name, 30);
    
    try {
      const promises = this.selectedSlots.map(slot => {
        let date, timeSlot;
        
        if (this.isDesktopView) {
          // 桌面端格式: "2025-06-03_09:00-09:30"
          [date, timeSlot] = slot.split('_');
        } else {
          // 移动端格式: "09:00-09:30"
          date = this.currentDate;
          timeSlot = slot;
        }
        
        return fetch(`${this.API_BASE_URL}/api/book`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({date, slot: timeSlot, name, system: this.SYSTEM_ID})
        }).then(res => res.json());
      });
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        this.showMessage('部分时间段失败：' + errors.map(e => e.error).join('；'), 'error');
      } else {
        this.showMessage('成功！', 'success');
      }
      
      this.selectedSlots = [];
      
      // 刷新数据
      if (this.isDesktopView) {
        this.fetchWeekSlots();
      } else {
        this.fetchSlots(this.currentDate);
      }
      
    } catch (error) {
      console.error('失败:', error);
      this.showMessage('失败，请检查网络连接', 'error');
    }
  }
  
  async showUserBookings() {
    const name = this.elements.nameInput.value;
    
    if (!name) {
      const savedName = this.getCookie(`${this.SYSTEM_ID}_userName`);
      if (savedName) {
        for (let i = 0; i < this.elements.nameInput.options.length; i++) {
          if (this.elements.nameInput.options[i].value === savedName) {
            this.elements.nameInput.selectedIndex = i;
            await this.fetchUserBookings(savedName);
            return;
          }
        }
      }
      this.showMessage('请先选择姓名', 'error');
      return;
    }
    
    await this.fetchUserBookings(name);
  }
  
  async fetchUserBookings(name) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/user-bookings?name=${encodeURIComponent(name)}&system=${this.SYSTEM_ID}`);
      const bookings = await response.json();
      this.displayUserBookings(name, bookings);
    } catch (error) {
      console.error('获取情况失败:', error);
      this.showMessage('获取情况失败，请检查网络连接', 'error');
    }
  }
  
  displayUserBookings(name, bookings) {
    const systemName = this.SYSTEM_ID === 'a_device' ? 'A仪器' : 'B仪器';
    this.elements.bookingsTitle.textContent = `${name}在${systemName}的情况`;
    
    this.elements.bookingsList.innerHTML = '';
    
    if (bookings.length === 0) {
      const noBookingsDiv = document.createElement('div');
      noBookingsDiv.className = 'no-bookings';
      noBookingsDiv.textContent = '暂无记录';
      this.elements.bookingsList.appendChild(noBookingsDiv);
    } else {
      const bookingsByDate = {};
      
      bookings.forEach(booking => {
        if (!bookingsByDate[booking.date]) {
          bookingsByDate[booking.date] = [];
        }
        bookingsByDate[booking.date].push(booking.slot);
      });
      
      Object.keys(bookingsByDate).sort().forEach(date => {
        const dateHeading = document.createElement('h3');
        dateHeading.textContent = this.formatDateChinese(new Date(date));
        this.elements.bookingsList.appendChild(dateHeading);
        
        bookingsByDate[date].sort().forEach(slot => {
          const bookingItem = document.createElement('div');
          bookingItem.className = 'booking-item';
          bookingItem.textContent = slot;
          this.elements.bookingsList.appendChild(bookingItem);
        });
      });
    }
    
    this.elements.bookingsModal.style.display = 'block';
  }
  
  async loadNames() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/names`);
      const data = await response.json();
      
      while (this.elements.nameInput.options.length > 1) {
        this.elements.nameInput.remove(1);
      }
      
      const savedName = this.getCookie(`${this.SYSTEM_ID}_userName`);
      
      data.names.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        this.elements.nameInput.appendChild(option);
        
        if (savedName && name === savedName) {
          option.selected = true;
        }
      });
    } catch (error) {
      console.error('加载名字列表失败:', error);
      this.showMessage('加载名字列表失败，请刷新页面重试', 'error');
    }
  }
  
  showMessage(text, type = 'error') {
    this.elements.messageDiv.textContent = text;
    this.elements.messageDiv.className = `message ${type}`;
    this.elements.messageDiv.style.display = 'block';
    
    setTimeout(() => {
      this.elements.messageDiv.style.display = 'none';
    }, 3000);
  }
  
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  formatDateChinese(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 ${weekday}`;
  }
  
  setCookie(name, value, days = 30) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  }
  
  getCookie(name) {
    const cookieName = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(cookieName) === 0) {
        return cookie.substring(cookieName.length, cookie.length);
      }
    }
    return "";
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new ResponsiveBookingSystem();
});
