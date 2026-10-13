with open('frontend/src/context/AuthContext.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('showToast(Bienvenido, );', \"showToast('Bienvenido, ' + res.user.full_name);\")

with open('frontend/src/context/AuthContext.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('AuthContext updated')
