# backend/app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os

app = Flask(__name__)
# 允许所有来源的跨域请求，简化开发和测试
CORS(app, resources={r"/api/*": {"origins": "*"}})
# 储存预约数据: { 'system_id': { '2025-06-01': { '09:00-09:15': '张三' } } }
# 使用嵌套字典结构，第一层是系统ID，然后是日期，然后是时间段
bookings = {
    'a_device': {},  # A仪器预约系统
    'b_device': {}   # B仪器预约系统
}

# 生成一天的时间段，根据仪器类型设置不同的时间间隔
def generate_time_slots(start="09:00", end="18:00", interval=30, system_id=None):
    # 根据系统ID设置不同的时间间隔
    if system_id == 'b_device':
        # B仪器每小时一个时间段
        interval = 60
    
    slots = []
    current = datetime.strptime(start, "%H:%M")
    end_time = datetime.strptime(end, "%H:%M")
    while current < end_time:
        next_time = current + timedelta(minutes=interval)
        slots.append(f"{current.strftime('%H:%M')}-{next_time.strftime('%H:%M')}")
        current = next_time
    return slots

@app.route('/api/slots', methods=['GET'])
def get_slots():
    system_id = request.args.get('system', 'a_device')  # 默认为A仪器系统
    date = request.args.get('date')
    if not date:
        return jsonify({"error": "Date required"}), 400
    
    # 确保系统ID存在
    if system_id not in bookings:
        bookings[system_id] = {}
        
    all_slots = generate_time_slots(system_id=system_id)
    booked = bookings[system_id].get(date, {})
    result = [
        {"time": slot, "booked": slot in booked, "name": booked.get(slot)}
        for slot in all_slots
    ]
    return jsonify(result)

@app.route('/api/book', methods=['POST'])
def book_slot():
    data = request.get_json()
    system_id = data.get('system', 'a_device')  # 默认为A仪器系统
    date = data.get('date')
    slot = data.get('slot')
    name = data.get('name')
    if not date or not slot or not name:
        return jsonify({"error": "Missing fields"}), 400

    # 确保系统ID存在
    if system_id not in bookings:
        bookings[system_id] = {}
    
    # 确保日期存在
    if date not in bookings[system_id]:
        bookings[system_id][date] = {}
        
    if slot in bookings[system_id][date]:
        return jsonify({"error": "Slot already booked"}), 400

    bookings[system_id][date][slot] = name
    return jsonify({"success": True})

@app.route('/api/user-bookings', methods=['GET'])
def get_user_bookings():
    name = request.args.get('name')
    system_id = request.args.get('system', 'a_device')  # 默认为A仪器系统
    
    if not name:
        return jsonify({"error": "Name required"}), 400
    
    # 确保系统ID存在    
    if system_id not in bookings:
        return jsonify([])  # 如果系统不存在，返回空列表
        
    # 收集该用户在指定系统中的所有预约
    user_bookings = []
    for date in bookings[system_id]:
        for slot, booked_name in bookings[system_id][date].items():
            if booked_name == name:
                user_bookings.append({
                    "date": date,
                    "slot": slot
                })
    
    # 按日期和时间排序
    user_bookings.sort(key=lambda x: (x["date"], x["slot"]))
    
    return jsonify(user_bookings)

@app.route('/api/book/delete', methods=['POST'])
def delete_booking():
    """取消预约"""
    data = request.get_json()
    system_id = data.get('system')
    date = data.get('date')
    slot = data.get('slot')
    
    if not system_id or not date or not slot:
        return jsonify({"error": "Missing fields"}), 400
    
    if system_id not in bookings or date not in bookings[system_id] or slot not in bookings[system_id][date]:
        return jsonify({"error": "Booking not found"}), 404
    
    # 删除预约
    del bookings[system_id][date][slot]
    
    return jsonify({"success": True})

@app.route('/api/names', methods=['GET'])
def get_names():
    """获取名字列表"""
    try:
        # 检查文件是否存在
        if not os.path.exists('names.json'):
            # 如果不存在，创建默认文件
            with open('names.json', 'w', encoding='utf-8') as f:
                json.dump({"names": ["田浩", "陈莹"]}, f, ensure_ascii=False)
        
        # 读取文件内容
        with open('names.json', 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        print(f"读取名字列表失败: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # 在生产环境上可以监听所有接口以便外部访问
    app.run(debug=True, host='0.0.0.0', port=5000)
