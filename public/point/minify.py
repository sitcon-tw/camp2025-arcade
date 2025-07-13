import csv

# 讀取原始 CSV
with open('group.csv', mode='r', encoding='utf-8-sig') as infile:
    reader = csv.DictReader(infile)
    filtered_rows = [
        {"時間": row["時間"], "用戶名稱": row["用戶名稱"], "餘額": row["餘額"]}
        for row in reader
    ]

# 寫入新的 CSV
with open('personal.csv', mode='w', encoding='utf-8', newline='') as outfile:
    fieldnames = ["時間", "用戶名稱", "餘額"]
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(filtered_rows)
