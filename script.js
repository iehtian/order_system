const dateInput = document.getElementById('dateInput');
const nameInput = document.getElementById('nameInput');
const slotsContainer = document.getElementById('slots');
const messageDiv = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');

// 定义API基础URL，方便本地测试和生产环境切换
// 根据当前访问的域名自动判断使用哪个API地址
const API_BASE_URL = window.location.hostname === 'iehtian.top' || 
                    window.location.hostname === '120.53.234.45' ? 
                    '' : 'http://127.0.0.1:5000';

// 从当前页面URL获取系统ID
const getCurrentSystemId = () => {
  const pageName = window.location.pathname.split('/').pop();
  return pageName.replace('.html', '') || 'a_device'; // 默认为A仪器系统
};

// 当前系统ID
const SYSTEM_ID = getCurrentSystemId();

let selectedSlots = [];

function fetchSlots(date) {
  const apiUrl = `${API_BASE_URL}/api/slots?date=${date}&system=${SYSTEM_ID}`;
  console.log('正在请求API:', apiUrl);
  
  fetch(apiUrl)
      .then(res => {
        console.log('API响应状态:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('获取到的数据:', data);
        renderSlots(data);
      })
      .catch(error => {
        console.error('获取时间段失败:', error);
        messageDiv.textContent = '获取时间段失败，请检查网络连接或刷新页面';
      });
}

function renderSlots(slots) {
  slotsContainer.innerHTML = '';
  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.textContent =
        slot.booked ? `${slot.time}\n已被${slot.name}预约` : slot.time;
    btn.title = slot.booked ? `${slot.time} - 已被 ${slot.name} 预约` :
                              slot.time;  // 添加tooltip显示完整信息
    btn.className = 'slot-button';
    if (slot.booked) {
      btn.classList.add('booked');
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => toggleSlot(slot.time, btn));
    }
    if (selectedSlots.includes(slot.time)) {
      btn.classList.add('selected');
    }
    slotsContainer.appendChild(btn);
  });
}

function toggleSlot(time, button) {
  const index = selectedSlots.indexOf(time);
  if (index > -1) {
    selectedSlots.splice(index, 1);
    button.classList.remove('selected');
  } else {
    selectedSlots.push(time);
    button.classList.add('selected');
  }
}

submitBtn.addEventListener('click', () => {
  const date = dateInput.value;
  const name = nameInput.value;

  if (!name || selectedSlots.length === 0 || !date) {
    messageDiv.textContent = '请填写所有信息。';
    return;
  }

  Promise
      .all(selectedSlots.map(slot => {
        return fetch(`${API_BASE_URL}/api/book`, {
                 method: 'POST',
                 headers: {'Content-Type': 'application/json'},
                 body: JSON.stringify({date, slot, name, system: SYSTEM_ID})
               })
            .then(res => res.json());
      }))
      .then(results => {
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
          messageDiv.textContent =
              '部分时间段预约失败：' + errors.map(e => e.error).join('；');
        } else {
          messageDiv.textContent = '预约成功！';
        }
        selectedSlots = [];
        nameInput.value = '';
        fetchSlots(date);
      });
});

dateInput.addEventListener('change', () => {
  selectedSlots = [];
  fetchSlots(dateInput.value);
});

// 设置默认日期为当前日期的下一天
function setDefaultDate() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  // 格式化日期为YYYY-MM-DD
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  
  const formattedDate = `${year}-${month}-${day}`;
  dateInput.value = formattedDate;
  
  // 加载明天的时间段
  fetchSlots(formattedDate);
}

// 从API加载名字列表
function loadNames() {
  fetch(`${API_BASE_URL}/api/names`)
    .then(response => {
      if (!response.ok) {
        throw new Error('无法加载名字列表');
      }
      return response.json();
    })
    .then(data => {
      // 清空下拉框（保留默认选项）
      while (nameInput.options.length > 1) {
        nameInput.remove(1);
      }
      
      // 添加从API加载的名字
      data.names.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        nameInput.appendChild(option);
      });
    })
    .catch(error => {
      console.error('加载名字列表失败:', error);
      messageDiv.textContent = '加载名字列表失败，请刷新页面重试';
    });
}

// 页面加载时设置默认日期并获取时间段，同时加载名字列表
window.addEventListener('load', () => {
  setDefaultDate();
  loadNames();
});

// 查看预约情况相关功能
const viewBookingsLink = document.getElementById('viewBookingsLink');
const bookingsModal = document.getElementById('bookingsModal');
const bookingsTitle = document.getElementById('bookingsTitle');
const bookingsList = document.getElementById('bookingsList');
const closeButton = document.querySelector('.close-button');

// 关闭弹窗
closeButton.addEventListener('click', () => {
  bookingsModal.style.display = 'none';
});

// 点击弹窗外部区域时关闭
window.addEventListener('click', (event) => {
  if (event.target === bookingsModal) {
    bookingsModal.style.display = 'none';
  }
});

// 查看预约情况
viewBookingsLink.addEventListener('click', (event) => {
  event.preventDefault();
  const name = nameInput.value;
  
  if (!name) {
    messageDiv.textContent = '请先选择姓名';
    return;
  }
  
  fetchUserBookings(name);
});

// 获取用户预约情况
function fetchUserBookings(name) {
  const apiUrl = `${API_BASE_URL}/api/user-bookings?name=${encodeURIComponent(name)}&system=${SYSTEM_ID}`;
  
  fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      showUserBookings(name, data);
    })
    .catch(error => {
      console.error('获取预约情况失败:', error);
      messageDiv.textContent = '获取预约情况失败，请检查网络连接或刷新页面';
    });
}

// 显示用户预约情况
function showUserBookings(name, bookings) {
  // 设置标题
  const systemName = SYSTEM_ID === 'a_device' ? 'A仪器' : SYSTEM_ID;
  bookingsTitle.textContent = `${name}在${systemName}的预约情况`;
  
  // 清空列表
  bookingsList.innerHTML = '';
  
  // 如果没有预约
  if (bookings.length === 0) {
    const noBookingsDiv = document.createElement('div');
    noBookingsDiv.className = 'no-bookings';
    noBookingsDiv.textContent = '暂无预约记录';
    bookingsList.appendChild(noBookingsDiv);
  } else {
    // 按日期分组显示
    const bookingsByDate = {};
    
    // 分组
    bookings.forEach(booking => {
      if (!bookingsByDate[booking.date]) {
        bookingsByDate[booking.date] = [];
      }
      bookingsByDate[booking.date].push(booking.slot);
    });
    
    // 按日期排序并显示
    Object.keys(bookingsByDate).sort().forEach(date => {
      // 创建日期标题
      const dateHeading = document.createElement('h3');
      dateHeading.textContent = formatDate(date);
      bookingsList.appendChild(dateHeading);
      
      // 创建时间段列表
      bookingsByDate[date].sort().forEach(slot => {
        const bookingItem = document.createElement('div');
        bookingItem.className = 'booking-item';
        bookingItem.textContent = slot;
        bookingsList.appendChild(bookingItem);
      });
    });
  }
  
  // 显示弹窗
  bookingsModal.style.display = 'block';
}

// 格式化日期显示
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 获取星期几
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[date.getDay()];
  
  return `${year}年${month}月${day}日 ${weekday}`;
}
