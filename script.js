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

let selectedSlots = [];

function fetchSlots(date) {
  const apiUrl = `${API_BASE_URL}/api/slots?date=${date}`;
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
                 body: JSON.stringify({date, slot, name})
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

// 页面加载时设置默认日期并获取时间段
window.addEventListener('load', setDefaultDate);
