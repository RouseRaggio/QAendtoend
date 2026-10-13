with open('frontend/src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'width:' in line and 'passPct' in line:
        lines[i] = '            <div style={{ height: "100%", background: "#14b8a6", width: passPct + "%" }} />\n'

with open('frontend/src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Line 148 cleanly updated')
