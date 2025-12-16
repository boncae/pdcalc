import { useState, useMemo, useEffect, type ChangeEvent, type KeyboardEvent } from 'react'; 
import './App.css';
import myNewImage from './assets/dogma-fanart.png';

// --- 타입 정의 (변경 없음) ---
interface Stats {
  SAD: number;
  CDR: number;
  PD: number;
  CR: number;
  CD: number;
}

interface CombatResult {
  totalCombatPower: number;
  skillDPT: number;
  normalAttackDPT: number;
  efficiency: {
    SAD: number;
    CDR: number;
    PD: number;
    CR: number;
    CD: number;
  };
}

interface StatInputProps {
  name: keyof Stats;
  label: string;
  unit: string;
  value: number;
  efficiency: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const INITIAL_STATS: Stats = {
  SAD: 50,
  CDR: 10,
  PD: 30,
  CR: 15,
  CD: 150,
};

// --- 전투력 계산 함수 (치명타 2배 기본 적용) ---
function calculateCombatPower(stats: Stats): CombatResult {
  const BASE_SKILL_DMG = 500;
  const BASE_NORMAL_DMG = 100;
  const ATTACK_SPEED_FACTOR = 1.0;
  const SKILL_USAGE_FACTOR = 0.5;

  const sadMultiplier = 1 + stats.SAD / 100;
  const pdMultiplier = 1 + stats.PD / 100;

  const cdrEfficiency = 1 / (1 - stats.CDR / 100);
  const skillTotalDmg = BASE_SKILL_DMG * sadMultiplier * cdrEfficiency;
  const skillDPT = skillTotalDmg * SKILL_USAGE_FACTOR;

  // CR이 100%를 초과하지 않도록 보장
  const effectiveCR = Math.min(stats.CR, 100); 
  
  // 치명타 시 (기본 100% + stats.CD%) 추가 피해 적용
  const totalCritBonus = 100 + stats.CD; 
  const critMultiplier = effectiveCR / 100 * (totalCritBonus / 100);
  
  const baseDamage = BASE_NORMAL_DMG * pdMultiplier;
  const averageDamage = baseDamage * (1 + critMultiplier);
  const normalAttackDPT = averageDamage * ATTACK_SPEED_FACTOR;

  const totalCombatPower = skillDPT + normalAttackDPT;

  const efficiency: CombatResult['efficiency'] = {
    SAD: 0, CDR: 0, PD: 0, CR: 0, CD: 0
  };

  efficiency.SAD = (BASE_SKILL_DMG / 100) * cdrEfficiency * SKILL_USAGE_FACTOR;
  efficiency.PD = (BASE_NORMAL_DMG / 100) * (1 + critMultiplier) * ATTACK_SPEED_FACTOR;
  
  const newCdrEff = 1 / (1 - (stats.CDR + 1) / 100);
  efficiency.CDR = BASE_SKILL_DMG * sadMultiplier * (newCdrEff - cdrEfficiency) * SKILL_USAGE_FACTOR;
  
  if (stats.CR >= 100) {
      efficiency.CR = 0; 
  } else {
      // CR 효율 계산 시에도 기본 100% 추가 피해 반영
      efficiency.CR = baseDamage * (0.01 * (100 + stats.CD) / 100) * ATTACK_SPEED_FACTOR;
  }
  
  efficiency.CD = baseDamage * (effectiveCR / 100 * 0.01) * ATTACK_SPEED_FACTOR;

  return {
    totalCombatPower: Math.round(totalCombatPower),
    skillDPT: Math.round(skillDPT),
    normalAttackDPT: Math.round(normalAttackDPT),
    efficiency,
  };
}

// --- 입력 컴포넌트 (✨ 인라인 스타일 적용) ---
const StatInput: React.FC<StatInputProps> = ({ name, label, unit, value, efficiency, onChange }) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 
      96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 
      8, 9, 13, 46, 37, 39
    ];
    if (!allowedKeys.includes(e.keyCode) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  };

  return (
    <div className="stat-input">
      <label htmlFor={name}>{label} ({unit}):</label>
      <input
        id={name}
        type="text"
        inputMode="numeric"
        onKeyDown={handleKeyDown}
        value={value === 0 ? '' : value}
        onChange={onChange}
        /* ✨ 수정된 부분: 인라인 스타일로 너비와 정렬 지정 */
        style={{ width: '60px', textAlign: 'right' }} 
      />
      <span className="efficiency">
         (1{unit}당 {efficiency.toFixed(2)} 효율)
      </span>
    </div>
  );
};

export default function App() {
  // 💾 2. useState 초기화 로직 변경: LocalStorage에서 데이터 불러오기
  const [stats, setStats] = useState<Stats>(() => {
    const savedStats = localStorage.getItem('dogma-stats');
    if (savedStats) {
      return { ...INITIAL_STATS, ...JSON.parse(savedStats) };
    }
    return INITIAL_STATS;
  });
  const [showCRHelp, setShowCRHelp] = useState(false);

  // 💾 3. useEffect 추가: stats가 변할 때마다 LocalStorage에 저장
  useEffect(() => {
    localStorage.setItem('dogma-stats', JSON.stringify(stats));
  }, [stats]);


  // ✨ 수정된 부분: CR 값 제한 로직 적용
  const handleStatChange = (statName: keyof Stats, e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let numericValue = value === '' ? 0 : Number(value);

    if (!isNaN(numericValue) && numericValue >= 0) {
      
      // CR 값은 100을 초과할 수 없도록 제한
      if (statName === 'CR') {
        numericValue = Math.min(numericValue, 100);
      }

      setStats(prevStats => ({
        ...prevStats,
        [statName]: numericValue,
      }));
    }
  };

  const { totalCombatPower, skillDPT, normalAttackDPT, efficiency } = useMemo<CombatResult>(() => {
    return calculateCombatPower(stats);
  }, [stats]);

  return (
    <>
      <div></div>
      <h1>⚔️ 맹든링 전투력 측정기 ⚔️</h1>

      {/* ✨ 레이아웃 변경: main-container로 두 카드를 묶음 */}
      <div className="main-container">

        {/* 1. 왼쪽 카드: 스탯 입력 */}
        <div className="card stat-card">
          <h2>📊 스크롤스탯 도합값 입력</h2>

          <h3>⚡️ 법사 스탯</h3>
          <StatInput 
            name="SAD" label="스킬 추가 데미지" unit="%" 
            value={stats.SAD} 
            efficiency={efficiency.SAD} 
            onChange={(e) => handleStatChange("SAD", e)} 
          />
          <StatInput 
            name="CDR" label="쿨타임 감소" unit="%" 
            value={stats.CDR} 
            efficiency={efficiency.CDR} 
            onChange={(e) => handleStatChange("CDR", e)} 
          />

          <h3>💥 전사 스탯</h3>
          <StatInput 
            name="PD" label="물리 공격력 증가" unit="%" 
            value={stats.PD} 
            efficiency={efficiency.PD} 
            onChange={(e) => handleStatChange("PD", e)} 
          />
          <StatInput 
            name="CR" label="치명타 확률" unit="%" 
            value={stats.CR} 
            efficiency={efficiency.CR} 
            onChange={(e) => handleStatChange("CR", e)} 
          />
          <StatInput 
            name="CD" label="치명타 데미지" unit="%" 
            value={stats.CD} 
            efficiency={efficiency.CD} 
            onChange={(e) => handleStatChange("CD", e)} 
          />
<p className="read-the-docs">
            *보스전에서 스킬만 쓰고 빠질때의 전투력을 기준으로 설계됐습니다.
          </p>

        </div>

        {/* 2. 오른쪽 카드: 최종 전투력 및 효율 */}
        <div className="card result-card">
          <h2>🔥 최종 전투력 : {totalCombatPower.toLocaleString()}</h2>
          <p><strong>법사스킬 투력 : </strong> {skillDPT.toLocaleString()}</p>
          <p><strong>전사 투력 : </strong> {normalAttackDPT.toLocaleString()}</p>
          <hr/>
          <h2>📈 현재 스크롤효율</h2>
          <div className="efficiency-list">
            <p><strong>스킬 추가데미지 1%당 </strong> {efficiency.SAD.toFixed(2)}효율</p>
            <p><strong>스킬 쿨타임감소 1%당 </strong> {efficiency.CDR.toFixed(2)}효율</p>
            <p><strong>물리 공격력 1%당 </strong> {efficiency.PD.toFixed(2)}효율</p>
            <div className="help-row">
              <p><strong>치명타 확률 1%당 </strong> {efficiency.CR.toFixed(2)}효율</p>
              <button
                type="button"
                className="help-icon"
                aria-label="치명타 확률 효율 설명 보기"
                onClick={() => setShowCRHelp((v) => !v)}
              >
                ?
              </button>
              {showCRHelp && (
                <div className="help-tooltip" role="dialog" aria-label="치명타 확률 효율 설명">
                  <button className="help-tooltip-close" aria-label="닫기" onClick={() => setShowCRHelp(false)}>×</button>
{/*                   <span className="title">치명타 확률 효율이란?</span> */}
                  <div>
                    치명타 확률 효율은 치명타 데미지와 공격력에 정비례합니다. 치뎀 효율은 치확이 100이 되기전까지 치확보다 효율이 낮습니다.
                  </div>
                  <div className="formula">
                   치명타 확률은 100%를 초과할 수 없습니다.
                  </div>
{/*                   <div className="note">
                    여기서 기본평타데미지 = 100 × (1 + PD/100)
                  </div> */}
                </div>  
              )}
            </div>

            <p><strong>치명타 데미지 1%당 </strong> {efficiency.CD.toFixed(2)}효율</p>
          </div>
          <p className="read-the-docs">
            *스크롤로 1%를 증가시켰을때 해당 효율만큼 전투력이 증가합니다.
          </p>
        </div>
      </div> {/* main-container 닫힘 */}

      <a target="_blank">
        <img src={myNewImage} className="logo react" alt="새로운 로고" />
<p className="read-the-docs">
            이 사이트는 저작권이 없으며 데이터는 사용자 컴퓨터에 저장되고 서버에 전송되지않습니다.
          </p>

      </a>

    </>
  );
}