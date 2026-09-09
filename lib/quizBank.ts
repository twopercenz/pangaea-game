import { QuizCard } from "./types";

// 지질 시대와 화석 단원 기반 4지선다 30문항 (보너스/장난 문항 일부 포함)
const RAW: Omit<QuizCard, "quizId">[] = [
  {
    category: "화석",
    question: "화석의 생성되는 과정으로 옳은 것은?",
    options: ["죽자마자 암석으로 변한다", "퇴적물에 묻혀 빠르게 암석으로 변한다", "오랜 시간 퇴적물에 묻혀 굳어 만들어진다", "물에 잠겨 만들어진다"],
    correctIndex: 2,
  },
  {
    category: "대멸종",
    question: "대멸종의 원인으로 옳지 않은 것은?",
    options: ["기후 변화", "운석 충돌", "화산 폭발", "너"],
    correctIndex: 3,
  },
  {
    category: "화석",
    question: "화석의 생성 조건으로 옳지 않은 것은?",
    options: ["개체 수가 많아야 한다", "땅이 넓어야 한다", "화석화 작용이 필요하다", "생물이 뼈나 껍데기를 가지고 있어야 한다"],
    correctIndex: 1,
  },
  {
    category: "고생대",
    question: "양치식물로 옳은 것은?",
    options: ["참나무", "고사리", "은행나무", "소나무"],
    correctIndex: 1,
  },
  {
    category: "화석",
    question: "표준 화석으로 옳지 않은 것은?",
    options: ["삼엽충", "공룡", "산호", "화폐석"],
    correctIndex: 2,
  },
  {
    category: "지질시대",
    question: "지질 시대의 순서로 알맞은 것은?",
    options: [
      "선캄브리아 시대 - 중생대 - 고생대 - 신생대",
      "고생대 - 중생대 - 신생대 - 선캄브리아 시대",
      "선캄브리아 시대 - 고생대 - 중생대 - 신생대",
      "신생대 - 중생대 - 고생대 - 선캄브리아 시대",
    ],
    correctIndex: 2,
  },
  {
    category: "지질시대",
    question: "지질 시대 중 가장 길었던 시대는?",
    options: ["선캄브리아 시대", "신생대", "중생대", "고생대"],
    correctIndex: 0,
  },
  {
    category: "대멸종",
    question: "고생대와 중생대 사이의 대멸종의 원인으로 옳은 것은?",
    options: ["너", "판게아 형성", "빙하기", "운석 충돌"],
    correctIndex: 1,
  },
  {
    category: "화석",
    question: "시상 화석의 종류로 옳은 것은?",
    options: ["고사리", "공룡", "너", "익룡"],
    correctIndex: 0,
  },
  {
    category: "선캄브리아대",
    question: "선캄브리아 시대에 등장한 생물로 옳은 것은?",
    options: ["너", "에디아카라 동물군", "양서류", "삼엽충"],
    correctIndex: 1,
  },
  {
    category: "보너스",
    question: "우리 학교에서 가장 예쁜 선생님은?",
    options: ["허만진 선생님", "이민욱 선생님", "김아영 선생님", "김소연 선생님"],
    correctIndex: 3,
  },
  {
    category: "고생대",
    question: "고생대에 출연한 생물로 옳지 않은 것은?",
    options: ["삼엽충", "갑주어", "스트로마톨라이트", "완족류"],
    correctIndex: 2,
  },
  {
    category: "고생대",
    question: "고생대의 환경 특징으로 옳지 않은 것은?",
    options: ["대체로 온난", "빙하기 존재", "지구 온난화", "판게아 형성으로 대멸종"],
    correctIndex: 2,
  },
  {
    category: "고생대",
    question: "고생대에 증가한 생물로 옳은 것은?",
    options: ["해양생물", "육지생물", "인류", "공중생물"],
    correctIndex: 0,
  },
  {
    category: "판게아",
    question: "판게아가 분리된 시기로 옳은 것은?",
    options: ["고생대", "신생대", "중생대", "선캄브리아 시대"],
    correctIndex: 2,
  },
  {
    category: "신생대",
    question: "신생대의 생물로 옳은 것은?",
    options: ["공룡", "매머드", "속씨식물", "암모나이트"],
    correctIndex: 1,
  },
  {
    category: "중생대",
    question: "중생대 생물들이 멸종한 원인으로 옳은 것은?",
    options: ["지구 온난화", "운석 충돌", "빙하기", "판게아 분리"],
    correctIndex: 1,
  },
  {
    category: "신생대",
    question: "속씨식물의 종류로 옳지 않은 것은?",
    options: ["소철", "단풍나무", "참나무", "고사리"],
    correctIndex: 0,
  },
  {
    category: "화석",
    question: "화석이 될 수 없는 것은?",
    options: ["알", "뼈", "발자국", "껍질"],
    correctIndex: 2,
  },
  {
    category: "보너스",
    question: "우리 학교에서 가장 재미있는 과학 선생님은?",
    options: ["이상래 선생님", "김소연 선생님", "김아영 선생님", "송오삼 선생님"],
    correctIndex: 2,
  },
  {
    category: "지질시대",
    question: "지질 시대 중 가장 짧은 시대는?",
    options: ["선캄브리아 시대", "신생대", "고생대", "중생대"],
    correctIndex: 1,
  },
  {
    category: "지질시대",
    question: "지질 시대 중 가장 긴 시대는?",
    options: ["선캄브리아 시대", "신생대", "고생대", "중생대"],
    correctIndex: 0,
  },
  {
    category: "고생대",
    question: "몸이 단단한 뼈판으로 된 해양 생물의 이름은?",
    options: ["구피", "복어", "갑주어", "실러캔스"],
    correctIndex: 2,
  },
  {
    category: "신생대",
    question: "빙하기에 살고 두꺼운 털과 상아가 있는 생물의 이름은?",
    options: ["코뿔소", "매머드", "호모사피엔스", "삼엽충"],
    correctIndex: 1,
  },
  {
    category: "고생대",
    question: "주로 바다 밑을 기어다니며 생활한 고생대의 생물 이름은?",
    options: ["남세균", "공룡", "이다엘네 강아지", "삼엽충"],
    correctIndex: 3,
  },
  {
    category: "화석",
    question: "화석을 이용해서 알 수 있는 것들로 옳지 않은 것은?",
    options: ["지구 형성", "환경 변화", "수륙 분포 변화", "지구 역사 이해"],
    correctIndex: 0,
  },
  {
    category: "고생대",
    question: "오존층이 생긴 지질 시대로 옳은 것은?",
    options: ["신생대", "고생대", "중생대", "선캄브리아 시대"],
    correctIndex: 1,
  },
  {
    category: "선캄브리아대",
    question: "에디아카라 동물군의 특징으로 옳지 않은 것은?",
    options: ["오스트레일리아 에디아카라 언덕에서 발견됨", "다세포 생물", "선캄브리아 시대에 생활", "에티오피아에서 발견됨"],
    correctIndex: 3,
  },
  {
    category: "보너스",
    question: "신생대의 특징으로 옳은 것은?",
    options: ["빙하기와 간빙기가 반복됨", "대서양과 인도양이 넓어짐", "공룡이 탄생함", "산맥이 형성됨"],
    correctIndex: 2,
  },
  {
    category: "중생대",
    question: "공룡이 탄생한 시대로 옳은 것은?",
    options: ["선캄브리아 시대", "중생대", "고생대", "신생대"],
    correctIndex: 1,
  },
];

export const QUIZ_BANK: QuizCard[] = RAW.map((q, i) => ({
  quizId: `quiz-${i + 1}`,
  ...q,
}));
