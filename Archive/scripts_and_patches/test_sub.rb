target = "abc"
code = "hello abc def"
airport_logic = "Chicago O'Hare"
res = code.sub(target) { airport_logic + "\n" + target }
puts res
