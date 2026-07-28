import pickle, sys
insns=pickle.load(open('/tmp/insns.pkl','rb'))
addr2idx={a:k for k,(a,m,o) in enumerate(insns)}
start=int(sys.argv[1],16); count=int(sys.argv[2]) if len(sys.argv)>2 else 60
k=addr2idx.get(start)
if k is None:
    # find nearest
    k=min(range(len(insns)), key=lambda j: abs(insns[j][0]-start))
for a,m,o in insns[k:k+count]:
    print(f"{a:05x}: {m:8} {o}")
