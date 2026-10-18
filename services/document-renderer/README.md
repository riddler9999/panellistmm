# Excel + PNG Renderer

SOP နှင့် Org Chart semantic contract v2 ကို deterministic `.xlsx` + `.png` pair အဖြစ်ထုတ်ပေးသည်။ Excel တွင် editable rows နှင့် PNG preview ပါပြီး PNG သည် User ကြည့်ရန် snapshot ဖြစ်သည်။

Runtime သည် Python 3.12၊ `requirements.txt` dependencies၊ RAQM-enabled Pillow နှင့် Myanmar/Latin fonts လိုအပ်သည်။ Production entry point:

```text
python render.py input.json output.xlsx output.png
```

Validation တွင် graph root/cycle/reachability/end-path၊ node/step limit၊ image size၊ input size နှင့် Excel formula-string neutralization ပါဝင်သည်။
