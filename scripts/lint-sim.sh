#!/usr/bin/env bash
# plan-v4 STEP 14 · js/sim 架构守卫
# 禁词：THREE / document / window / Math.random / Date.now / performance
# 命中非零退出。用法：bash scripts/lint-sim.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIM="$ROOT/js/sim"

if [[ ! -d "$SIM" ]]; then
  echo "FAIL: missing $SIM"
  exit 1
fi

# 用 Node 做词边界扫描，避免 macOS/GNU grep 正则差异
set +e
HITS="$(node -e '
const fs=require("fs"),path=require("path");
const root=process.argv[1];
const re=/\b(THREE|document|window|Math\.random|Date\.now|performance)\b/;
let bad=[];
for(const name of fs.readdirSync(root)){
  if(!name.endsWith(".js"))continue;
  const p=path.join(root,name);
  const lines=fs.readFileSync(p,"utf8").split(/\n/);
  lines.forEach((line,i)=>{
    if(re.test(line))bad.push(p+":"+(i+1)+":"+line.trim());
  });
}
if(bad.length){console.log(bad.join("\n"));process.exit(2);}
' "$SIM")"
RC=$?
set -e

if [[ "$RC" -ne 0 ]]; then
  echo "FAIL: js/sim 禁词守卫未通过："
  echo "$HITS"
  exit 1
fi

echo "PASS: js/sim lint-sim（无 THREE/document/window/Math.random/Date.now/performance）"
exit 0
