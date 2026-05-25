from google.colab import drive
drive.mount("/content/drive")


# !nvidia-smi


# !pip install -U transformers accelerate peft bitsandbytes trl datasets
# #

import os

BASE_MODEL_PATH = "/content/drive/MyDrive/mistral_7b_quantized"

print(os.listdir(BASE_MODEL_PATH))


import torch, gc

gc.collect()
torch.cuda.empty_cache()


from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
import torch

BASE_MODEL_PATH = "/content/drive/MyDrive/mistral_7b_quantized"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4"
)

model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    quantization_config=bnb_config,
    device_map="auto",
    low_cpu_mem_usage=True,     # 🔥 ABSOLUTELY REQUIRED
    local_files_only=True
)

tokenizer = AutoTokenizer.from_pretrained(
    BASE_MODEL_PATH,
    local_files_only=True
)

tokenizer.pad_token = tokenizer.eos_token

print("✅ Model loaded safely without RAM crash")


from peft import prepare_model_for_kbit_training

model.gradient_checkpointing_enable()
model = prepare_model_for_kbit_training(model)

print("✅ Model prepared for QLoRA training")


from peft import LoraConfig, get_peft_model

lora_config = LoraConfig(
    r=8,                    # safe, avoids overfitting
    lora_alpha=16,
    lora_dropout=0.1,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ]
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()


from datasets import load_dataset
import os

DATASET_PATH = "/content/drive/MyDrive/agentic_ai/data/future_ready_dataset.jsonl"
assert os.path.exists(DATASET_PATH), "❌ Dataset not found"

dataset = load_dataset("json", data_files=DATASET_PATH, split="train")

print("✅ Dataset loaded:", len(dataset))


import os
import torch

# 🔥 HARD DISABLE AMP & SCALER (GLOBAL)
os.environ["ACCELERATE_USE_FP16"] = "false"
os.environ["ACCELERATE_USE_BF16"] = "false"

torch.backends.cuda.matmul.allow_tf32 = False
torch.backends.cudnn.allow_tf32 = False


from datasets import load_dataset, concatenate_datasets

# Load subsets (KEEP SMALL)
orca = load_dataset("Open-Orca/OpenOrca", split="train[:6000]")
hermes = load_dataset("NousResearch/Nous-Hermes-2-GPT4", split="train[:3000]")

def format_example(x):
    return {
        "text": f"User: {x['question']}\nAssistant: {x['response']}"
    }

orca = orca.map(format_example, remove_columns=orca.column_names)
hermes = hermes.map(format_example, remove_columns=hermes.column_names)

dataset = concatenate_datasets([orca, hermes])
print("✅ Phase-1 Dataset size:", len(dataset))


from trl import SFTConfig

training_args = SFTConfig(
    output_dir="./mistral_ecommerce_chatbot",
    dataset_text_field="text",
    per_device_train_batch_size=1,     # 🔥 safest
    gradient_accumulation_steps=1,
    learning_rate=1e-4,
    logging_steps=10,
    max_steps=150,
    save_steps=50,
    fp16=False,
    bf16=False,
    optim="adamw_torch",               # 🔥 KEY FIX
    max_grad_norm=0.0,                 # 🔥 disable clipping
    warmup_ratio=0.03,
    packing=False,
    report_to="none"
)


from trl import SFTTrainer

trainer = SFTTrainer(
    model=model,          # LoRA already attached
    train_dataset=dataset,
    args=training_args
)

print("🚀 Training started...")
trainer.train()


SAVE_ADAPTER_PATH = "/content/drive/MyDrive/mistral_adapter_v3"

trainer.model.save_pretrained(SAVE_ADAPTER_PATH)
tokenizer.save_pretrained(SAVE_ADAPTER_PATH)

print("✅ Adapter saved to Drive")


from peft import prepare_model_for_kbit_training, LoraConfig, get_peft_model

model = prepare_model_for_kbit_training(model)

lora_cfg = LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.1,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=[
        "q_proj","k_proj","v_proj","o_proj",
        "gate_proj","up_proj","down_proj"
    ]
)

model = get_peft_model(model, lora_cfg)


from datasets import load_dataset

orca_stream = load_dataset(
    "Open-Orca/OpenOrca",
    split="train",
    streaming=True
)


from itertools import islice
from datasets import Dataset
import gc; gc.collect()

orca_samples = [
    {"text": f"User: {x['question']}\nAssistant: {x['response']}"}
    for x in islice(orca_stream, 5000)
]

phase1_dataset = Dataset.from_list(orca_samples)
print("PHASE-1 DATASET SIZE:", len(phase1_dataset))


from peft import PeftModel

if isinstance(model, PeftModel):
    model = model.base_model


from trl import SFTConfig

args = SFTConfig(
    output_dir="/content/phase1_instruction_lora_fast",
    dataset_text_field="text",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=1,   # 🔥 faster
    learning_rate=1e-4,
    max_steps=300,                   # 🔥 VERY IMPORTANT
    logging_steps=25,
    save_steps=300,                  # 🔥 save only once
    fp16=False,
    bf16=False,
    optim="paged_adamw_8bit",
    warmup_ratio=0.03,
    packing=False,
    report_to="none"
)


trainer = SFTTrainer(
    model=model,
    train_dataset=phase1_dataset,
    args=args
)

trainer.train()

SAVE_PATH = "/content/drive/MyDrive/mistral_adapter_v4"

trainer.model.save_pretrained(SAVE_PATH)
tokenizer.save_pretrained(SAVE_PATH)

print("✅ PHASE-1 ADAPTER READY")


import json
import os
from itertools import product

# -----------------------------
# SAVE PATH
# -----------------------------
SAVE_DIR = "/content/drive/MyDrive/agentic_ai/data"
os.makedirs(SAVE_DIR, exist_ok=True)

SAVE_PATH = os.path.join(SAVE_DIR, "agentic_phase2_dataset.jsonl")

# -----------------------------
# TOOL DEFINITIONS
# -----------------------------
TOOLS = {
    "product_search": {
        "tool": "search",
        "queries": [
            "Search iphone under 50000",
            "Find laptops under 70000",
            "Show shoes below 3000",
            "Search samsung phones"
        ],
        "response": lambda q: {
            "intent": "product_search",
            "tool": "search"
        }
    },

    "place_order": {
        "tool": "order",
        "queries": [
            "Order 2 kg rice",
            "Buy 1 litre milk",
            "Order 3 packets of biscuits",
            "Place order for sugar"
        ],
        "response": lambda q: {
            "intent": "place_order",
            "tool": "order"
        }
    },

    "track_order": {
        "tool": "track",
        "queries": [
            "Track my order",
            "Where is my order?",
            "Check delivery status"
        ],
        "response": lambda q: {
            "intent": "track_order",
            "tool": "track"
        }
    },

    "cancel_order": {
        "tool": "cancel",
        "queries": [
            "Cancel my order",
            "Cancel the last order",
            "Stop my purchase"
        ],
        "response": lambda q: {
            "intent": "cancel_order",
            "tool": "cancel"
        }
    },

    "recommendation": {
        "tool": "recommend",
        "queries": [
            "Recommend laptops for coding",
            "Suggest phones for gaming",
            "Best headphones under 5000"
        ],
        "response": lambda q: {
            "intent": "recommendation",
            "tool": "recommend"
        }
    },

    "navigation": {
        "tool": "navigate",
        "queries": [
            "Go to cart",
            "Open my orders",
            "Show wishlist"
        ],
        "response": lambda q: {
            "intent": "navigation",
            "tool": "navigate"
        }
    }
}

# -----------------------------
# GENERATE DATASET
# -----------------------------
dataset = []

for intent, data in TOOLS.items():
    for query in data["queries"]:
        sample = {
            "text": (
                "You are an agentic AI. Respond ONLY in valid JSON.\n"
                f"User: {query}\n"
                f"Assistant: {json.dumps(data['response'](query))}"
            )
        }
        dataset.append(sample)

# -----------------------------
# SAVE JSONL
# -----------------------------
with open(SAVE_PATH, "w") as f:
    for row in dataset:
        f.write(json.dumps(row) + "\n")

print("✅ Phase-2 agentic dataset created")
print("📄 Samples:", len(dataset))
print("📁 Saved at:", SAVE_PATH)


from datasets import load_dataset

AGENT_DATA_PATH = "/content/drive/MyDrive/agentic_ai/data/agentic_phase2_dataset.jsonl"

agent_dataset = load_dataset(
    "json",
    data_files=AGENT_DATA_PATH,
    split="train"
)

print("Agent dataset size:", len(agent_dataset))


from trl import SFTConfig

phase2_args = SFTConfig(
    output_dir="/content/phase2_agentic_lora",
    dataset_text_field="text",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=1,
    learning_rate=5e-5,
    max_steps=150,
    logging_steps=10,
    save_steps=150,
    fp16=False,
    bf16=False,
    optim="paged_adamw_8bit",
    warmup_ratio=0.0,
    packing=False,
    report_to="none",
    remove_unused_columns=False   # 🔥 THIS FIXES IT
)


from trl import SFTTrainer
from accelerate.state import AcceleratorState

# reset accelerate state (already correct)
AcceleratorState._reset_state()

trainer = SFTTrainer(
    model=model,
    train_dataset=agent_dataset,
    args=phase2_args,
    processing_class=tokenizer   # 🔥 THIS FIXES input_ids ERROR
)

print("🚀 PHASE-2 TRAINING STARTED (FINAL)")
trainer.train()


SAVE_PATH = "/content/drive/MyDrive/mistral_adapter_v4"

trainer.model.save_pretrained(SAVE_PATH)
tokenizer.save_pretrained(SAVE_PATH)

print("✅ PHASE-2 ADAPTER READY")


from peft import PeftModel
import torch

PHASE1_PATH = "/content/drive/MyDrive/mistral_adapter_v4"

model = PeftModel.from_pretrained(
    model,
    PHASE1_PATH,
    is_trainable=False
)
model.eval()

print("✅ Phase-1 adapter loaded for testing")


import torch
model.eval()


def agent_generate(user_query):
    prompt = (
        "You are an agentic AI.\n"
        "Respond ONLY in valid JSON.\n\n"
        f"User: {user_query}\n"
        "Assistant:"
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt"
    ).to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=80,              # 🔥 HARD STOP
            do_sample=False,                # 🔥 NO RANDOMNESS
            temperature=0.0,
            top_p=1.0,
            repetition_penalty=1.2,         # 🔥 PREVENT LOOPS
            eos_token_id=tokenizer.eos_token_id,
            pad_token_id=tokenizer.eos_token_id,
            use_cache=True
        )

    text = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # 🔥 CUT PROMPT ECHO
    if "Assistant:" in text:
        text = text.split("Assistant:")[1].strip()

    # 🔥 STOP MULTI-LINE / RUNAWAY
    text = text.split("\n")[0].strip()

    return text


print("🤖 Agentic AI Ready")
print("Type 'exit' to stop\n")

while True:
    user_input = input("USER > ").strip()

    if user_input.lower() in ["exit", "quit", "q"]:
        print("👋 Exiting Agent")
        break

    output = agent_generate(user_input)

    print("AGENT >", output)

    # Optional JSON validation
    try:
        json.loads(output)
        print("✅ Valid JSON\n")
    except:
        print("❌ Invalid JSON (needs more training)\n")


tests = [
    "Search iphone under 50000",
    "Order 2 kg rice",
    "Cancel my order",
    "Track my last order",
    "Recommend laptops for coding"
]

for t in tests:
    print("\nUSER:", t)
    print("MODEL:", agent_generate(t))


import json

def is_valid_json(text):
    try:
        json.loads(text)
        return True
    except:
        return False

for t in tests:
    output = agent_generate(t)
    print("\nUSER:", t)
    print("MODEL:", output)
    print("VALID JSON:", is_valid_json(output))



