import json
import logging
from openai import OpenAI
from app.services.settings_service import runtime_settings_service

logger = logging.getLogger(__name__)


def _get_client() -> OpenAI:
    ai_config = runtime_settings_service.get_ai_config()
    return OpenAI(
        api_key=ai_config["api_key"],
        base_url=ai_config["base_url"],
    )


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start:end + 1])
        raise


def _chat(prompt: str, max_tokens: int = 2000, json_mode: bool = False) -> str:
    client = _get_client()
    ai_config = runtime_settings_service.get_ai_config()
    request = {
        "model": ai_config["model"],
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if json_mode:
        request["response_format"] = {"type": "json_object"}
    try:
        resp = client.chat.completions.create(**request)
    except Exception:
        if not json_mode:
            raise
        request.pop("response_format", None)
        resp = client.chat.completions.create(**request)
    return resp.choices[0].message.content


def _chat_json(prompt: str, max_tokens: int = 2000) -> dict:
    json_prompt = f"{prompt}\n\n重要：只返回一个合法 JSON 对象，不要 Markdown，不要解释。"
    text = _chat(json_prompt, max_tokens=max_tokens, json_mode=True)
    try:
        return _parse_json_response(text)
    except json.JSONDecodeError:
        repair_prompt = f"""下面内容本应是 JSON，但格式不合法。请修复为一个合法 JSON 对象。

原始内容：
{text}

只返回修复后的 JSON 对象，不要解释。"""
        repaired = _chat(repair_prompt, max_tokens=max_tokens, json_mode=True)
        return _parse_json_response(repaired)


class AIService:

    async def extract_resume_info(self, raw_text: str) -> dict:
        prompt = f"""你是一位专业的HR助手，请从以下简历原文中提取关键信息，以JSON格式返回。

简历原文：
{raw_text}

请提取并返回以下JSON结构（所有字段必须存在，无信息填null或空列表）：
{{
  "candidate_name": "姓名",
  "email": "邮箱",
  "phone": "手机号",
  "skills": ["技能1", "技能2"],
  "education": [
    {{
      "school": "学校名称",
      "degree": "学历",
      "major": "专业",
      "start_year": 2018,
      "end_year": 2022
    }}
  ],
  "experience": [
    {{
      "company": "公司名称",
      "position": "职位",
      "start_date": "2022-01",
      "end_date": "2024-06",
      "description": "工作内容描述",
      "achievements": ["成就1", "成就2"]
    }}
  ],
  "summary": "个人简介",
  "total_years_experience": 3
}}

只返回JSON，不要任何额外解释。"""
        return _chat_json(prompt)

    async def evaluate_resume(
        self,
        raw_text: str,
        job_title: str,
        job_requirements: str,
        evaluation_criteria: str,
        key_skills: list,
    ) -> dict:
        skills_str = "、".join(key_skills) if key_skills else "无特定要求"
        criteria_section = evaluation_criteria if evaluation_criteria else "请根据岗位要求综合评估"
        prompt = f"""你是一位资深HR专家和技术面试官，请对以下候选人简历进行全面评估打分。

【招聘岗位】：{job_title}
【岗位要求】：
{job_requirements}
【关键技能要求】：{skills_str}
【评估标准】：
{criteria_section}
【候选人简历】：
{raw_text}

请从以下维度进行评估，返回JSON格式结果：
{{
  "match_score": 85,
  "dimension_scores": {{
    "技能匹配度": 90,
    "经验匹配度": 80,
    "学历匹配度": 85,
    "综合素质": 75
  }},
  "core_strengths": ["核心优势1", "核心优势2", "核心优势3"],
  "potential_risks": ["潜在风险1", "潜在风险2"],
  "interview_suggestions": ["面试建议1", "面试建议2", "面试建议3"],
  "overall_assessment": "综合评估总结（200字以内）",
  "recommendation": "强烈推荐/推荐/待定/不推荐"
}}

评分标准：90-100强烈推荐，75-89推荐，60-74待定，40-59谨慎，0-39不推荐。
只返回JSON，不要任何额外解释。"""
        return _chat_json(prompt)

    async def generate_evaluation_criteria(
        self,
        job_title: str,
        job_requirements: str,
        key_skills: list,
        education_requirement: str,
        experience_years_min: int,
        experience_years_max: int,
    ) -> str:
        skills_str = "、".join(key_skills) if key_skills else "无特定要求"
        prompt = f"""你是一位资深HR专家，请根据以下岗位信息，生成一套详细、结构化的LLM评估标准。
该标准将被用于指导AI系统自动评估候选人简历与该岗位的匹配程度。

岗位名称：{job_title}
岗位要求：{job_requirements}
关键技能：{skills_str}
学历要求：{education_requirement}
经验要求：{experience_years_min}-{experience_years_max}年

请生成包含以下部分的评估标准：
1. 必备条件（硬性要求，不满足则直接淘汰）
2. 技能评估标准（每项技能的评分细则）
3. 经验评估标准（经验质量的评判维度）
4. 加分项（有这些背景会额外加分）
5. 减分项（有这些情况会扣分）
6. 综合评分权重建议

请用中文生成，格式清晰，条理分明。"""
        return _chat(prompt)


ai_service = AIService()
