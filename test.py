import requests
import json

# 基础配置
BASE_URL = "http://14.103.237.160:29876"  # 直接访问后端接口
API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkb25ncml4aW55dSIsImV4cCI6MTc2MzQ1NzU1Nn0.gCGNkTXgLcOhC8GuQZNfiXCljyA5JJCOqgRaPT83wkM"

def test_upload_rotate_with_user_id():
    """测试 upload_rotate 接口 - 使用 User-Id 格式"""
    print("=" * 50)
    print("测试 upload_rotate 接口 - User-Id 格式")
    print("=" * 50)
    
    url = f"{BASE_URL}/rorschach/analyze/upload_rotate"
    
    # 使用 User-Id 格式（根据之前的测试，这是最接近成功的格式）
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "User-Id": "Bubble_Lis"
    }
    
    # 准备正确的文件数据格式
    # 根据错误信息，后端期望的是整数值而不是列表
    rotate_data = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0
    }
    
    # 添加 user_id 到数据中
    data = {
        "user_id": "Bubble_Lis",
    }
    
    # 使用 files 参数，模拟 FormData.append('file', file, 'rotate.json')
    files = {
        'file': ('rotate.json', json.dumps(rotate_data, ensure_ascii=False), 'application/json')
    }
    
    print(f"请求 URL: {url}")
    print(f"请求 Headers: {headers}")
    print(f"请求数据: {json.dumps(data, ensure_ascii=False)}")
    print(f"文件数据: {json.dumps(rotate_data, ensure_ascii=False)}")
    
    try:
        response = requests.post(url, headers=headers, data=data, files=files, timeout=10)
        print(f"\n状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"\nJSON 响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
                if result.get('code') == 0:
                    print("✅ 上传成功")
                    return True
                else:
                    print(f"❌ 上传失败: {result.get('msg', '未知错误')}")
                    if result.get('exception'):
                        print(f"异常信息: {result.get('exception')}")
                    return False
            except Exception as e:
                print(f"解析 JSON 失败: {e}")
                print("响应不是 JSON 格式")
                return False
        else:
            print(f"❌ HTTP 错误: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        import traceback
        traceback.print_exc()
        return False

# 主函数
if __name__ == "__main__":
    print("开始测试罗夏墨迹测试 API 接口\n")
    
    # 测试 upload_rotate 接口
    success = test_upload_rotate_with_user_id()
    
    if success:
        print("\n✅ 测试成功完成")
    else:
        print("\n❌ 测试失败")
    
    print("\n" + "=" * 50)
    print("测试完成")
    print("=" * 50)