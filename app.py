# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)
# 允许所有来源的跨域请求，简化开发和测试
CORS(app, resources={r"/api/*": {"origins": "*"}})
# 储存预约数据: { '2025-06-01': { '09:00-09:15': '张三' } }
bookings = {}

# 生成一天的时间段，每15分钟一个段
def generate_time_slots(start="09:00", end="18:00", interval=15):
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
    date = request.args.get('date')
    if not date:
        return jsonify({"error": "Date required"}), 400
    all_slots = generate_time_slots()
    booked = bookings.get(date, {})
    result = [
        {"time": slot, "booked": slot in booked, "name": booked.get(slot)}
        for slot in all_slots
    ]
    return jsonify(result)

@app.route('/api/book', methods=['POST'])
def book_slot():
    data = request.get_json()
    date = data.get('date')
    slot = data.get('slot')
    name = data.get('name')
    if not date or not slot or not name:
        return jsonify({"error": "Missing fields"}), 400

    if date not in bookings:
        bookings[date] = {}
    if slot in bookings[date]:
        return jsonify({"error": "Slot already booked"}), 400

    bookings[date][slot] = name
    return jsonify({"success": True})

if __name__ == '__main__':
    # 在生产环境上可以监听所有接口以便外部访问
    app.run(debug=True, host='0.0.0.0', port=5000)
