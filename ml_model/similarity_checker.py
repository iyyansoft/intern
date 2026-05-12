import sys
import json
import warnings
import os

warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import logging
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)

from sentence_transformers import SentenceTransformer, util

# ✅ Load model once
model = SentenceTransformer('all-MiniLM-L6-v2')


# 🔹 Clean text
def clean_text(text):
    return text.lower().strip()


# 🔹 Split targets into tasks
def decompose_targets(target_text):
    tasks = []
    for line in target_text.split("\n"):
        for part in line.split(";"):
            t = clean_text(part)
            if t:
                tasks.append(t)
    return tasks


# 🔹 Compute similarity safely
def get_similarity(t_vec, progress):
    progress = clean_text(progress)

    if not progress or progress == "-":
        return 0

    p_vec = model.encode(progress, show_progress_bar=False)
    sim = util.cos_sim(t_vec, p_vec).item()

    return max(0, min(100, int(sim * 100)))


# 🔹 Main function
# 🔹 Main function
def calculate_completion(target_text, progress_list, total_slots=7):
    tasks = decompose_targets(target_text)

    if not tasks:
        return {"similarity": 0}

    # ✅ Pre-encode tasks
    task_vectors = {task: model.encode(task, show_progress_bar=False) for task in tasks}

    completed = 0
    details = []

    for task in tasks:
        t_vec = task_vectors[task]
        best_score = 0

        for progress in progress_list:
            score = get_similarity(t_vec, progress)
            best_score = max(best_score, score)

        # ✅ Check completion
        is_done = best_score >= 60

        if is_done:
            completed += 1

        details.append({
            "task": task,
            "score": best_score,
            "completed": is_done
        })

    # 🔹 Use total_slots as the base for 100% calculation
    completion = int((completed / total_slots) * 100)

    return {
        "similarity": min(100, completion),
        "total_tasks_found": len(tasks),
        "completed_count": completed,
        "total_slots": total_slots,
        "details": details
    }


# 🔹 CLI
if __name__ == "__main__":
    if len(sys.argv) >= 4:
        target = sys.argv[1]
        progress_json = sys.argv[2]
        total_slots = int(sys.argv[3])

        try:
            progress_list = json.loads(progress_json)
        except:
            progress_list = [progress_json]

        result = calculate_completion(target, progress_list, total_slots)
        print(json.dumps(result))

    else:
        # ✅ TEST CASE (this SHOULD NOT return 0 now)
        target = """setup project, design database, implement login,
build UI, file upload, testing"""

        progress_list = [
            "Initialized React and Express project",
            "Created MongoDB schema",
            "Built login API",
            "Developed UI using React"
        ]

        result = calculate_completion(target, progress_list)
        print(json.dumps(result, indent=2))