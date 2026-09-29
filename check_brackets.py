import sys

def check_brackets(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    stack = []
    brackets = {'{': '}', '[': ']', '(': ')'}
    rev_brackets = {v: k for k, v in brackets.items()}
    
    in_string = False
    in_single_comment = False
    in_multi_comment = False
    string_char = None
    
    i = 0
    while i < len(content):
        c = content[i]
        
        if in_single_comment:
            if c == '\n':
                in_single_comment = False
            i += 1
            continue
            
        if in_multi_comment:
            if c == '*' and i + 1 < len(content) and content[i+1] == '/':
                in_multi_comment = False
                i += 1
            i += 1
            continue
            
        if in_string:
            if c == '\\':
                i += 2
                continue
            if c == string_char:
                in_string = False
            i += 1
            continue
            
        if c in ['"', "'", '`']:
            in_string = True
            string_char = c
            i += 1
            continue
            
        if c == '/' and i + 1 < len(content):
            if content[i+1] == '/':
                in_single_comment = True
                i += 1
                i += 1
                continue
            if content[i+1] == '*':
                in_multi_comment = True
                i += 1
                i += 1
                continue
                
        if c in brackets:
            stack.append((c, i))
        elif c in rev_brackets:
            if not stack:
                print(f"Unmatched {c} at {i}")
                return False
            if stack[-1][0] != rev_brackets[c]:
                print(f"Mismatched {c} at {i}, expected {brackets[stack[-1][0]]}")
                return False
            stack.pop()
            
        i += 1
        
    if stack:
        print(f"Unmatched {stack[-1][0]} at {stack[-1][1]}")
        return False
        
    print("Brackets match perfectly!")
    return True

check_brackets('Code.gs')
