code = File.read('Code.gs')

code = code.gsub('cCountIfs("I need lodging before the event", "Yes")', 'cCountIfs("*lodging before*", "*Yes*")')
code = code.gsub('cCountIfs("I need lodging after the event", "Yes")', 'cCountIfs("*lodging after*", "*Yes*")')

File.write('Code.gs', code)
puts 'Success!'
