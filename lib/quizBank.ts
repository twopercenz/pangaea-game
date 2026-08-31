import { QuizCard } from "./types";

// 고1 통합과학/과학 "지질 시대와 화석" 단원 기반, 쉬움 난이도 4지선다 30문항
const RAW: Omit<QuizCard, "quizId">[] = [
  {
    category: "화석",
    question: "화석이 만들어지기 위한 조건으로 옳지 않은 것은?",
    options: ["개체 수가 많아야 한다", "단단한 뼈나 껍데기가 있으면 유리하다", "생물이 죽은 직후 빠르게 매몰되어야 한다", "반드시 육지에서만 살았어야 한다"],
    correctIndex: 3,
  },
  {
    category: "화석",
    question: "특정 지질 시대를 알려주는 화석을 무엇이라고 하는가?",
    options: ["표준 화석", "시상 화석", "생흔 화석", "표품 화석"],
    correctIndex: 0,
  },
  {
    category: "화석",
    question: "지층이 쌓일 당시의 환경을 알려주는 화석을 무엇이라고 하는가?",
    options: ["표준 화석", "시상 화석", "지표 화석", "표본 화석"],
    correctIndex: 1,
  },
  {
    category: "화석",
    question: "표준 화석이 되기 좋은 생물의 조건으로 가장 옳은 것은?",
    options: ["분포 지역이 좁고 생존 기간이 길다", "분포 지역이 넓고 생존 기간이 짧다", "분포 지역이 좁고 생존 기간이 짧다", "개체 수가 매우 적다"],
    correctIndex: 1,
  },
  {
    category: "선캄브리아대",
    question: "지구 최초의 산소를 만들어 낸 광합성 생물로 알려진 것은?",
    options: ["삼엽충", "시아노박테리아(남세균)", "암모나이트", "매머드"],
    correctIndex: 1,
  },
  {
    category: "선캄브리아대",
    question: "시아노박테리아의 활동으로 만들어진, 층상 구조를 가진 퇴적 구조는?",
    options: ["스트로마톨라이트", "산호초", "빙하", "삼각주"],
    correctIndex: 0,
  },
  {
    category: "선캄브리아대",
    question: "선캄브리아 시대 말기에 나타난, 부드러운 몸체를 가진 다세포 생물 화석군은?",
    options: ["에디아카라 동물군", "버제스 동물군", "공룡군", "매머드군"],
    correctIndex: 0,
  },
  {
    category: "선캄브리아대",
    question: "선캄브리아 시대 화석이 매우 드문 이유로 가장 적절한 것은?",
    options: ["생물이 전혀 없었기 때문에", "대부분 단단한 부분이 없는 생물이었고 지각 변동을 많이 받았기 때문에", "화석이 모두 불에 탔기 때문에", "당시 지구에 물이 없었기 때문에"],
    correctIndex: 1,
  },
  {
    category: "고생대",
    question: "고생대를 대표하는 삼엽충은 어떤 생물인가?",
    options: ["해양 무척추동물", "육상 파충류", "포유류", "속씨식물"],
    correctIndex: 0,
  },
  {
    category: "고생대",
    question: "다음 중 고생대 바다에서 번성한 생물이 아닌 것은?",
    options: ["삼엽충", "완족류", "필석류", "공룡"],
    correctIndex: 3,
  },
  {
    category: "고생대",
    question: "고생대에 번성했던 원시 어류로, 몸에 딱딱한 골판을 가진 것은?",
    options: ["갑주어", "상어", "고래", "실러캔스"],
    correctIndex: 0,
  },
  {
    category: "고생대",
    question: "단세포 생물로 석회질 껍데기를 가지며 표준 화석으로도 쓰이는 것은?",
    options: ["유공충", "해파리", "산호", "불가사리"],
    correctIndex: 0,
  },
  {
    category: "고생대",
    question: "고생대 중기에 오존층이 형성되면서 생긴 변화로 가장 옳은 것은?",
    options: ["바다 생물이 모두 사라졌다", "자외선이 차단되어 육상 생물이 번성하기 시작했다", "지구 전체가 얼어붙었다", "대륙이 모두 갈라졌다"],
    correctIndex: 1,
  },
  {
    category: "고생대",
    question: "오존층 형성 이후 육상에서 번성하기 시작한 생물로 옳은 것은?",
    options: ["양서류와 양치식물, 거대 곤충", "포유류와 속씨식물", "파충류와 겉씨식물", "인류와 참나무"],
    correctIndex: 0,
  },
  {
    category: "고생대",
    question: "고생대 말기에 처음 등장한 생물 조합으로 옳은 것은?",
    options: ["파충류와 겉씨식물", "포유류와 속씨식물", "삼엽충과 필석류", "공룡과 암모나이트"],
    correctIndex: 0,
  },
  {
    category: "고생대",
    question: "고생대 말, 모든 대륙이 하나로 합쳐져 형성된 초대륙의 이름은?",
    options: ["판게아", "로디니아", "유라시아", "곤드와나"],
    correctIndex: 0,
  },
  {
    category: "고생대",
    question: "판게아가 형성된 직후(고생대 말) 지구에 일어난 큰 사건은?",
    options: ["최대 규모의 대멸종", "공룡의 첫 등장", "인류의 출현", "빙하기의 완전한 종료"],
    correctIndex: 0,
  },
  {
    category: "중생대",
    question: "중생대를 대표하며 육상을 지배했던 동물 무리는?",
    options: ["파충류(공룡)", "포유류", "양서류", "조류만"],
    correctIndex: 0,
  },
  {
    category: "중생대",
    question: "중생대 바다에서 번성했던 나선형 껍데기를 가진 두족류는?",
    options: ["암모나이트", "삼엽충", "완족류", "유공충"],
    correctIndex: 0,
  },
  {
    category: "중생대",
    question: "중생대에 번성한 겉씨식물로 옳은 것을 모두 고른 것은?",
    options: ["소철과 은행나무", "참나무와 단풍나무", "벼와 보리", "이끼류"],
    correctIndex: 0,
  },
  {
    category: "중생대",
    question: "중생대에 처음 등장한 생물 조합으로 옳은 것은?",
    options: ["포유류와 속씨식물", "파충류와 겉씨식물", "삼엽충과 필석류", "인류와 매머드"],
    correctIndex: 0,
  },
  {
    category: "중생대",
    question: "중생대에 하나였던 판게아는 어떻게 변화했는가?",
    options: ["여러 대륙으로 갈라지기 시작했다", "더 단단하게 뭉쳐졌다", "바다 밑으로 가라앉았다", "변화가 전혀 없었다"],
    correctIndex: 0,
  },
  {
    category: "신생대",
    question: "신생대에 번성했던 대형 포유류로, 긴 털과 상아를 가진 동물은?",
    options: ["매머드", "삼엽충", "암모나이트", "갑주어"],
    correctIndex: 0,
  },
  {
    category: "신생대",
    question: "동물의 배설물이 굳어져 만들어진 화석을 무엇이라고 하는가?",
    options: ["코프롤라이트(분화석)", "스트로마톨라이트", "표준 화석", "생흔 화석 전체"],
    correctIndex: 0,
  },
  {
    category: "신생대",
    question: "신생대에 크게 번성하여 오늘날까지 이어지는 식물 무리는?",
    options: ["속씨식물", "겉씨식물", "이끼류", "조류(藻類)"],
    correctIndex: 0,
  },
  {
    category: "신생대",
    question: "신생대 후기에 처음 나타난 것으로 알려진 것은?",
    options: ["인류의 조상", "공룡", "삼엽충", "필석류"],
    correctIndex: 0,
  },
  {
    category: "신생대",
    question: "다음 중 신생대에 흔했던 낙엽수로 옳은 것은?",
    options: ["참나무와 단풍나무", "소철과 은행나무", "겉씨식물 전체", "이끼류 전체"],
    correctIndex: 0,
  },
  {
    category: "판게아",
    question: "판게아가 여러 대륙으로 갈라진 결과로 옳은 것은?",
    options: ["오늘날과 같은 여러 대륙과 해양 분포가 만들어졌다", "지구의 대륙이 다시 하나로 합쳐졌다", "모든 생물이 멸종했다", "바다가 사라졌다"],
    correctIndex: 0,
  },
  {
    category: "지질시대",
    question: "지질 시대를 오래된 순서대로 옳게 나열한 것은?",
    options: ["선캄브리아대 - 고생대 - 중생대 - 신생대", "고생대 - 선캄브리아대 - 중생대 - 신생대", "신생대 - 중생대 - 고생대 - 선캄브리아대", "중생대 - 고생대 - 신생대 - 선캄브리아대"],
    correctIndex: 0,
  },
  {
    category: "지질시대",
    question: "지질 시대 구분의 기준이 되는 큰 사건으로 가장 옳은 것은?",
    options: ["대멸종 등 생물계의 급격한 변화", "매일의 날씨 변화", "하루의 길이 변화", "달의 모양 변화"],
    correctIndex: 0,
  },
];

export const QUIZ_BANK: QuizCard[] = RAW.map((q, i) => ({
  quizId: `quiz-${i + 1}`,
  ...q,
}));
