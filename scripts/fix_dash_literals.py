with open('frontend/src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'width: %',
    'width: passPct + "%"'
)

content = content.replace(
    'background: conic-gradient(#10b981 0% %, #ef4444 % %, #f59e0b % 100%),',
    'background: "conic-gradient(#10b981 0% " + metrics.pass_pct + "%, #ef4444 " + metrics.pass_pct + "% " + (metrics.pass_pct + metrics.bug_pct) + "%, #f59e0b " + (metrics.pass_pct + metrics.bug_pct) + "% 100%)",'
)

with open('frontend/src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('DashboardPage template literals replaced')
