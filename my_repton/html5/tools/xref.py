import pickle, re
insns=pickle.load(open('/tmp/insns.pkl','rb'))
addr2idx={a:k for k,(a,m,o) in enumerate(insns)}
names={0x100:'repmap.dat',0x10b:'pblog3.pcx',0x116:'InputPrompt',0x12b:'reptit.pcx',0x138:'FUCKINGPOO',0x146:'repton.pcx',0x151:'repman.pcx',0x15c:'rep8pix.pcx',0x168:'" x %d"'}
def show(center_addr, before=6, after=14):
    k=addr2idx.get(center_addr)
    if k is None: return
    print(f"--- around {center_addr:05x} ---")
    for a,m,o in insns[max(0,k-before):k+after]:
        print(f"{a:05x}: {m:8} {o}")
for off,nm in names.items():
    pat=f'0x{off:x}'
    hits=[(a,m,o) for a,m,o in insns if m in ('mov','push','lea') and re.search(rf'\b{re.escape(pat)}\b', o)]
    print(nm, [hex(a) for a,_,_ in hits])
