from capstone import *
from capstone.x86 import *
import pickle
load=open('/tmp/load.bin','rb').read()
md=Cs(CS_ARCH_X86, CS_MODE_16)
md.detail=True
insns=[]
addr=0
# linear sweep over whole image
code=load
insns=list(md.disasm(code, 0))
print("total insns:", len(insns))
pickle.dump([(i.address,i.mnemonic,i.op_str) for i in insns], open('/tmp/insns.pkl','wb'))

# xrefs to data strings (DS base = load 0xb160)
DS=0xb160
names={0x100:'repmap.dat',0x10b:'pblog3.pcx',0x116:'InputPrompt',0x12b:'reptit.pcx',0x138:'FUCKINGPOO',0x146:'repton.pcx',0x151:'repman.pcx',0x15c:'rep8pix.pcx',0x168:' x %d'}
for i in insns:
    if i.mnemonic in ('mov','push','lea') and i.op_str:
        for off,nm in names.items():
            if f'0x{off:x}' in i.op_str:
                print(f"XREF {nm:16} @ {i.address:05x}: {i.mnemonic} {i.op_str}")
