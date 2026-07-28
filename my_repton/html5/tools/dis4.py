from capstone import *
import pickle
load=open('/tmp/load.bin','rb').read()
md=Cs(CS_ARCH_X86, CS_MODE_16)
insns=[]
pos=0
n=len(load)
while pos < n:
    found=False
    for i in md.disasm(load[pos:pos+16], pos, count=1):
        insns.append((i.address,i.mnemonic,i.op_str))
        pos += i.size
        found=True
        break
    if not found:
        pos += 1
print("insns:", len(insns), "coverage end:", hex(insns[-1][0]))
pickle.dump(insns, open('/tmp/insns.pkl','wb'))
