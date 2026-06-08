import sys

path = r'c:\Users\nick\Desktop\Asset-Manager\artifacts\doorstepApp\app\chat\[id].tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

idx = 0
for i, line in enumerate(lines):
    if line.startswith('  memberRow: {'):
        idx = i

new_end = [
    '  memberRow: {\n',
    '    flexDirection: "row",\n',
    '    alignItems: "center",\n',
    '    paddingVertical: 10,\n',
    '    borderBottomWidth: StyleSheet.hairlineWidth,\n',
    '    gap: 12,\n',
    '  },\n',
    '  memberInfo: { flex: 1, gap: 2 },\n',
    '  memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },\n',
    '  memberHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },\n',
    '  addMemberBtn: {\n',
    '    width: 32,\n',
    '    height: 32,\n',
    '    borderRadius: 16,\n',
    '    alignItems: "center",\n',
    '    justifyContent: "center",\n',
    '  },\n',
    '});\n'
]

lines = lines[:idx] + new_end

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Repaired file!')
