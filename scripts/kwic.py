"""Print every passage in a regs/ file that contains a phrase: python3 scripts/kwic.py FILE PHRASE [WIDTH] [MAX]"""
import sys
text = open(sys.argv[1]).read()
phrase, width = sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 300
limit = int(sys.argv[4]) if len(sys.argv) > 4 else 3
i, n = text.find(phrase), 0
while i >= 0 and n < limit:
    print("…" + text[max(0, i - width // 3): i + width] + "…\n")
    i, n = text.find(phrase, i + 1), n + 1
