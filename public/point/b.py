import pandas as pd
import csv

def process_points_data(input_file, output_file):
    """
    處理餘額變化數據，對每個人每十筆取一筆
    
    Args:
        input_file (str): 輸入CSV文件路徑
        output_file (str): 輸出CSV文件路徑
    """
    
    # 讀取CSV文件
    df = pd.read_csv(input_file, header=None, names=['時間', '用戶名稱', '餘額'])
    
    # 將時間轉換為datetime格式
    
    def parse_chinese_datetime(datetime_str):
        """解析包含中文上午/下午的時間格式"""
        datetime_str = str(datetime_str).strip()
        
        if '上午' in datetime_str:
            # 處理上午格式
            datetime_str = datetime_str.replace('上午', ' ')
            return pd.to_datetime(datetime_str, format='%Y/%m/%d %H:%M:%S')
        elif '下午' in datetime_str:
            # 處理下午格式 - 需要轉換為24小時制
            datetime_str = datetime_str.replace('下午', ' ')
            dt = pd.to_datetime(datetime_str, format='%Y/%m/%d %H:%M:%S')
            # 如果小時小於12，加12小時轉換為24小時制
            if dt.hour < 12:
                dt = dt + pd.Timedelta(hours=12)
            return dt
        else:
            # 沒有上午/下午標記，直接解析
            return pd.to_datetime(datetime_str)
    
    # 應用時間解析函數
    df['時間'] = df['時間'].apply(parse_chinese_datetime)
    
    # 按用戶名稱分組並按時間排序
    df_sorted = df.sort_values(['用戶名稱', '時間'])
    
    # 對每個人每十筆取一筆
    sampled_data = []
    
    for name, group in df_sorted.groupby('用戶名稱'):
        # 重設索引以便進行採樣
        group_reset = group.reset_index(drop=True)
        
        # 每十筆取一筆（索引0, 10, 20, 30...）
        sampled_rows = group_reset.iloc[::10]
        
        sampled_data.append(sampled_rows)
    
    # 合併所有採樣後的數據
    result_df = pd.concat(sampled_data, ignore_index=True)
    
    # 按時間重新排序
    result_df = result_df.sort_values('時間')
    
    # 保存到新的CSV文件
    result_df.to_csv(output_file, index=False, header=False)
    
    print(f"原始數據筆數: {len(df)}")
    print(f"處理後數據筆數: {len(result_df)}")
    print(f"數據已保存到: {output_file}")
    
    # 顯示每個人的數據統計
    print("\n各人員數據統計:")
    for name, group in df_sorted.groupby('用戶名稱'):
        original_count = len(group)
        sampled_count = len(group.iloc[::10])
        print(f"{name}: {original_count} 筆 -> {sampled_count} 筆")
    
    return result_df

# 如果您的數據直接以字符串形式存在，可以使用以下方法：
def process_string_data(data_string, output_file):
    """
    處理字符串格式的數據
    
    Args:
        data_string (str): 輸入的數據字符串
        output_file (str): 輸出CSV文件路徑
    """
    
    # 將字符串轉換為列表
    lines = data_string.strip().split('\n')
    
    # 解析數據
    data = []
    for line in lines:
        parts = line.split(',')
        if len(parts) == 3:
            data.append([parts[0], parts[1], int(parts[2])])
    
    # 創建DataFrame
    df = pd.DataFrame(data, columns=['時間', '用戶名稱', '餘額'])
    df['時間'] = pd.to_datetime(df['時間'])
    
    # 按用戶名稱分組並按時間排序
    df_sorted = df.sort_values(['用戶名稱', '時間'])
    
    # 對每個人每十筆取一筆
    sampled_data = []
    
    for name, group in df_sorted.groupby('用戶名稱'):
        group_reset = group.reset_index(drop=True)
        sampled_rows = group_reset.iloc[::10]
        sampled_data.append(sampled_rows)
    
    # 合併所有採樣後的數據
    result_df = pd.concat(sampled_data, ignore_index=True)
    result_df = result_df.sort_values('時間')
    
    # 保存到CSV文件
    result_df.to_csv(output_file, index=False, header=False)
    
    print(f"原始數據筆數: {len(df)}")
    print(f"處理後數據筆數: {len(result_df)}")
    print(f"數據已保存到: {output_file}")
    
    return result_df

# 使用示例
if __name__ == "__main__":
    # 方法1: 如果您有CSV文件
    process_points_data('points.csv', 'group-min.csv')
    
    # 處理示例數據
    # process_string_data(sample_data, 'sampled_output.csv')
    
    print("腳本已準備完成！")