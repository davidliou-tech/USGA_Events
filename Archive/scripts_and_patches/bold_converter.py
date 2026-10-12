text = 'If the event participant is a minor under the age of 18, registration must be completed by a parent/guardian. The registrant’s email address (to be entered in the “Email” field immediately below) must be that of the minor participant’s parent/guardian.'
def to_bold_sans(s):
    res = []
    for c in s:
        if 'A' <= c <= 'Z':
            res.append(chr(ord(c) - ord('A') + 0x1D5D4))
        elif 'a' <= c <= 'z':
            res.append(chr(ord(c) - ord('a') + 0x1D5EE))
        elif '0' <= c <= '9':
            res.append(chr(ord(c) - ord('0') + 0x1D7EC))
        else:
            res.append(c)
    return ''.join(res)
print(to_bold_sans(text))
