'use client'

import Image from 'next/image'
import { BriefcaseBusiness, CheckCircle2, ChevronRight, HardHat, Megaphone, UsersRound, Wrench } from 'lucide-react'
import { useState } from 'react'
import './teams.css'
import teamGroupsJson from './teams.json'

type SupportedLocale = 'th' | 'en' | 'zh' | 'ja'

type FieldItem = {
  label: string
  image: string
}

type FieldGroup = {
  id: 'survey' | 'drilling' | 'maintenance'
  number: string
  label: string
  shortLabel: string
  summary: string
  highlights: string[]
  people: FieldItem[]
  equipment: FieldItem[]
  icon: string
}

type SectionCopy = {
  eyebrow: string
  intro: string
  teamHeading: string
  equipmentHeading: string
  selectorLabel: string
  groups: FieldGroup[]
}

type Person = {
  name: string
  role: 'leader' | 'member'
  title?: string
  certificates: string[]
  imageSrc: string
}

type PersonnelTeam = {
  name: string
  people: Person[]
}

type PersonnelGroup = {
  id: string
  label: string
  summary: string
  teams: PersonnelTeam[]
}

type UnifiedTeamId = FieldGroup['id'] | 'management' | 'marketing'

type SupportNavigation = {
  id: 'management' | 'marketing'
  label: string
  shortLabel: string
  summary: string
  icon: 'management' | 'marketing'
}

const PERSONNEL_GROUPS = teamGroupsJson as PersonnelGroup[]

const IMAGE_ROOT = '/images/about/teams'

const localizedCopy: Record<SupportedLocale, SectionCopy> = {
  th: {
    eyebrow: 'ทีมปฏิบัติงานภาคสนาม',
    intro: 'เลือกทีมเพื่อดูหน้าที่ บุคลากรควบคุมงาน และอุปกรณ์หลักที่ใช้ในแต่ละขั้นตอน',
    teamHeading: 'ทีมงาน',
    equipmentHeading: 'อุปกรณ์การทำงาน',
    selectorLabel: 'เลือกทีมปฏิบัติงาน',
    groups: [
      {
        id: 'survey',
        number: '01',
        label: 'ทีมสำรวจ',
        shortLabel: 'สำรวจและแปลผล',
        summary: 'สำรวจน้ำบาดาล น้ำแร่ และน้ำพุร้อน เพื่อช่วยกำหนดตำแหน่งเจาะที่เหมาะสม',
        highlights: [
          'ใช้เครื่อง Resistivity Meter สำรวจได้ลึกถึง 300 เมตร',
          'สำรวจและแปลผลโดยทีมที่มีประสบการณ์และความชำนาญ',
        ],
        people: [
          { label: 'สำรวจน้ำบาดาล น้ำแร่ น้ำพุร้อน', image: 'icon-service-survay-1.png' },
          { label: 'ทีมสำรวจ', image: 'icon-survay-team.png' },
          { label: 'นักธรณีควบคุมงาน', image: 'icon-geo-foreman.png' },
        ],
        equipment: [
          { label: 'ค้อนธรณี', image: 'icon-geo-hammer-update.png' },
          { label: 'เครื่องสำรวจ', image: 'icon-geo-device-update.png' },
          { label: 'เข็มทิศ', image: 'icon-compass.png' },
        ],
        icon: 'icon-survay-team.png',
      },
      {
        id: 'drilling',
        number: '02',
        label: 'ทีมเจาะ',
        shortLabel: 'เจาะและก่อสร้างบ่อ',
        summary: 'ก่อสร้างบ่อน้ำบาดาลโดยทีมช่างที่เข้าใจสภาพชั้นดินและชั้นหินหลายรูปแบบ',
        highlights: [
          'ช่างเจาะผ่านการอบรมและมีใบอนุญาตจากกรมทรัพยากรน้ำบาดาล',
          'มีประสบการณ์และความชำนาญ รวมถึงพื้นที่หินแข็งที่เจาะยาก',
        ],
        people: [
          { label: 'เจาะบ่อน้ำบาดาล', image: 'icon-service-well-drilling.png' },
          { label: 'ทีมเจาะ', image: 'icon-drilling-team.png' },
          { label: 'นักธรณีควบคุมงาน', image: 'icon-geo-foreman.png' },
        ],
        equipment: [
          { label: 'รถเจาะ', image: 'icon-drilling-truck-1-update.png' },
          { label: 'หัวเจาะ', image: 'icon-drillhead.png' },
          { label: 'เครื่องอัดลม', image: 'icon-pressure-truck.png' },
          { label: 'เครื่องมือช่าง', image: 'icon-hammer-update.png' },
          { label: 'ท่อ', image: 'icon-tube.png' },
        ],
        icon: 'icon-drilling-team.png',
      },
      {
        id: 'maintenance',
        number: '03',
        label: 'ทีมซ่อมบำรุง',
        shortLabel: 'ฟื้นฟูและดูแลระบบ',
        summary: 'ตรวจสอบ ซ่อม และบำรุงรักษาบ่อน้ำบาดาล เครื่องสูบน้ำ และระบบสูบทดสอบ',
        highlights: [
          'มีประสบการณ์ด้านบ่อน้ำบาดาล เครื่องสูบน้ำ และการสูบทดสอบปริมาณน้ำ',
          'ทีมปฏิบัติงานผ่านการอบรมด้านความปลอดภัย',
        ],
        people: [
          { label: 'ซ่อมบำรุงบ่อน้ำบาดาล', image: 'icon-service-3.png' },
          { label: 'ทีมซ่อม', image: 'icon-fixing-team.png' },
        ],
        equipment: [
          { label: 'เครื่องอัดลม', image: 'icon-pressure-truck.png' },
          { label: 'เครื่องสูบน้ำ', image: 'icon-pump-update.png' },
          { label: 'เครื่องมือช่างซ่อม', image: 'icon-wrench.png' },
        ],
        icon: 'icon-fixing-team.png',
      },
    ],
  },
  en: {
    eyebrow: 'FIELD OPERATIONS',
    intro: 'Select a team to see its responsibilities, field roles and core equipment for each stage of work.',
    teamHeading: 'Team',
    equipmentHeading: 'Work equipment',
    selectorLabel: 'Select a field team',
    groups: [],
  },
  zh: {
    eyebrow: '现场作业团队',
    intro: '选择团队，查看各作业阶段的职责、现场人员和主要设备。',
    teamHeading: '团队配置',
    equipmentHeading: '作业设备',
    selectorLabel: '选择现场团队',
    groups: [],
  },
  ja: {
    eyebrow: '現場施工チーム',
    intro: 'チームを選択すると、各工程の役割、現場体制、主要機材を確認できます。',
    teamHeading: 'チーム体制',
    equipmentHeading: '作業機材',
    selectorLabel: '現場チームを選択',
    groups: [],
  },
}

const translatedGroups: Record<Exclude<SupportedLocale, 'th'>, FieldGroup[]> = {
  en: [
    { ...localizedCopy.th.groups[0], label: 'Survey team', shortLabel: 'Survey and interpretation', summary: 'Groundwater, mineral-water and hot-spring surveys to identify suitable drilling locations.', highlights: ['Resistivity Meter surveys can investigate depths of up to 300 metres', 'Field surveys and interpretation are completed by an experienced specialist team'], people: [{ label: 'Groundwater, mineral-water and hot-spring surveys', image: 'icon-service-survay-1.png' }, { label: 'Survey team', image: 'icon-survay-team.png' }, { label: 'Supervising geologist', image: 'icon-geo-foreman.png' }], equipment: [{ label: 'Geological hammer', image: 'icon-geo-hammer-update.png' }, { label: 'Survey instrument', image: 'icon-geo-device-update.png' }, { label: 'Compass', image: 'icon-compass.png' }] },
    { ...localizedCopy.th.groups[1], label: 'Drilling team', shortLabel: 'Drilling and well construction', summary: 'Groundwater wells built by trained crews experienced in varied soil and rock conditions.', highlights: ['Drillers are trained and licensed by the Department of Groundwater Resources', 'Experienced in demanding ground conditions, including hard-rock drilling'], people: [{ label: 'Groundwater well drilling', image: 'icon-service-well-drilling.png' }, { label: 'Drilling team', image: 'icon-drilling-team.png' }, { label: 'Supervising geologist', image: 'icon-geo-foreman.png' }], equipment: [{ label: 'Drilling rig', image: 'icon-drilling-truck-1-update.png' }, { label: 'Drill bit', image: 'icon-drillhead.png' }, { label: 'Air compressor', image: 'icon-pressure-truck.png' }, { label: 'Technician tools', image: 'icon-hammer-update.png' }, { label: 'Well casing', image: 'icon-tube.png' }] },
    { ...localizedCopy.th.groups[2], label: 'Maintenance team', shortLabel: 'Rehabilitation and care', summary: 'Inspection, repair and maintenance of groundwater wells, pumps and pumping-test systems.', highlights: ['Experienced in wells, pumps and pumping-test operations', 'Field crews receive task-specific safety training'], people: [{ label: 'Groundwater well maintenance', image: 'icon-service-3.png' }, { label: 'Maintenance team', image: 'icon-fixing-team.png' }], equipment: [{ label: 'Air compressor', image: 'icon-pressure-truck.png' }, { label: 'Water pump', image: 'icon-pump-update.png' }, { label: 'Repair tools', image: 'icon-wrench.png' }] },
  ],
  zh: [
    { ...localizedCopy.th.groups[0], label: '勘查团队', shortLabel: '勘查与数据解释', summary: '开展地下水、矿泉水及温泉勘查，协助确定合适的钻井位置。', highlights: ['使用电阻率仪，勘查深度可达300米', '由经验丰富的专业团队完成现场勘查与成果解释'], people: [{ label: '地下水、矿泉水及温泉勘查', image: 'icon-service-survay-1.png' }, { label: '勘查团队', image: 'icon-survay-team.png' }, { label: '地质人员现场监督', image: 'icon-geo-foreman.png' }], equipment: [{ label: '地质锤', image: 'icon-geo-hammer-update.png' }, { label: '勘查仪器', image: 'icon-geo-device-update.png' }, { label: '指南针', image: 'icon-compass.png' }] },
    { ...localizedCopy.th.groups[1], label: '钻井团队', shortLabel: '钻井与成井施工', summary: '由熟悉多种土层和岩层条件的专业团队施工地下水井。', highlights: ['钻井人员经过培训，并持有地下水资源厅签发的许可证', '具备复杂地层施工经验，包括坚硬岩层'], people: [{ label: '地下水井施工', image: 'icon-service-well-drilling.png' }, { label: '钻井团队', image: 'icon-drilling-team.png' }, { label: '地质人员现场监督', image: 'icon-geo-foreman.png' }], equipment: [{ label: '钻井车', image: 'icon-drilling-truck-1-update.png' }, { label: '钻头', image: 'icon-drillhead.png' }, { label: '空气压缩机', image: 'icon-pressure-truck.png' }, { label: '施工工具', image: 'icon-hammer-update.png' }, { label: '井管', image: 'icon-tube.png' }] },
    { ...localizedCopy.th.groups[2], label: '维护团队', shortLabel: '修复与系统维护', summary: '检查、维修和维护地下水井、水泵及抽水试验系统。', highlights: ['具备水井、水泵和抽水试验作业经验', '现场团队均接受与工作相关的安全培训'], people: [{ label: '地下水井维护', image: 'icon-service-3.png' }, { label: '维护团队', image: 'icon-fixing-team.png' }], equipment: [{ label: '空气压缩机', image: 'icon-pressure-truck.png' }, { label: '水泵', image: 'icon-pump-update.png' }, { label: '维修工具', image: 'icon-wrench.png' }] },
  ],
  ja: [
    { ...localizedCopy.th.groups[0], label: '調査チーム', shortLabel: '調査・解析', summary: '地下水・鉱泉・温泉を調査し、適切な掘削候補地点を選定します。', highlights: ['比抵抗探査装置により深度300メートルまで調査可能', '経験豊富な専門チームが現地調査と解析を担当'], people: [{ label: '地下水・鉱泉・温泉調査', image: 'icon-service-survay-1.png' }, { label: '調査チーム', image: 'icon-survay-team.png' }, { label: '地質技術者による施工管理', image: 'icon-geo-foreman.png' }], equipment: [{ label: '地質ハンマー', image: 'icon-geo-hammer-update.png' }, { label: '調査機器', image: 'icon-geo-device-update.png' }, { label: 'コンパス', image: 'icon-compass.png' }] },
    { ...localizedCopy.th.groups[1], label: '掘削チーム', shortLabel: '掘削・井戸施工', summary: 'さまざまな土質・岩盤条件に精通したチームが地下水井を施工します。', highlights: ['掘削担当者は研修を修了し、地下水資源局の許可を取得', '硬岩など難しい地盤条件での豊富な施工経験'], people: [{ label: '地下水井掘削', image: 'icon-service-well-drilling.png' }, { label: '掘削チーム', image: 'icon-drilling-team.png' }, { label: '地質技術者による施工管理', image: 'icon-geo-foreman.png' }], equipment: [{ label: '掘削リグ', image: 'icon-drilling-truck-1-update.png' }, { label: 'ドリルビット', image: 'icon-drillhead.png' }, { label: 'エアコンプレッサー', image: 'icon-pressure-truck.png' }, { label: '施工工具', image: 'icon-hammer-update.png' }, { label: '井戸ケーシング', image: 'icon-tube.png' }] },
    { ...localizedCopy.th.groups[2], label: '保守チーム', shortLabel: '再生・維持管理', summary: '地下水井、ポンプ、揚水試験設備の点検・修理・保守を行います。', highlights: ['井戸、ポンプ、揚水試験に関する豊富な現場経験', '作業内容に応じた安全教育を修了した現場チーム'], people: [{ label: '地下水井の保守', image: 'icon-service-3.png' }, { label: '保守チーム', image: 'icon-fixing-team.png' }], equipment: [{ label: 'エアコンプレッサー', image: 'icon-pressure-truck.png' }, { label: '水中ポンプ', image: 'icon-pump-update.png' }, { label: '修理工具', image: 'icon-wrench.png' }] },
  ],
}

const supportNavigation: Record<SupportedLocale, SupportNavigation[]> = {
  th: [
    { id: 'management', label: 'ทีมบริหาร', shortLabel: 'วางแผนและควบคุมงาน', summary: 'ควบคุมและวางแผนการดำเนินงานให้ถูกต้องตามมาตรฐานและแล้วเสร็จตามกำหนด', icon: 'management' },
    { id: 'marketing', label: 'ทีมประชาสัมพันธ์', shortLabel: 'ความรู้และการสื่อสาร', summary: 'เผยแพร่ความรู้ที่ถูกต้องเกี่ยวกับการอนุรักษ์น้ำบาดาลและประสานงานกับผู้ใช้บริการ', icon: 'marketing' },
  ],
  en: [
    { id: 'management', label: 'Management team', shortLabel: 'Planning and control', summary: 'Plans and controls each operation to meet technical standards, quality targets and project schedules.', icon: 'management' },
    { id: 'marketing', label: 'Communications team', shortLabel: 'Knowledge and coordination', summary: 'Shares reliable groundwater knowledge and coordinates clear communication with clients and the public.', icon: 'marketing' },
  ],
  zh: [
    { id: 'management', label: '管理团队', shortLabel: '规划与管控', summary: '规划并管控各项工作，确保符合技术标准、质量目标和项目进度。', icon: 'management' },
    { id: 'marketing', label: '宣传团队', shortLabel: '知识与沟通', summary: '传播可靠的地下水知识，并与客户及公众保持清晰沟通。', icon: 'marketing' },
  ],
  ja: [
    { id: 'management', label: '管理チーム', shortLabel: '計画・品質管理', summary: '技術基準、品質目標、工程に沿って各業務を計画・管理します。', icon: 'management' },
    { id: 'marketing', label: '広報チーム', shortLabel: '知識・コミュニケーション', summary: '信頼できる地下水情報を発信し、お客様や社会との円滑な連携を支えます。', icon: 'marketing' },
  ],
}

const personnelHeadings: Record<SupportedLocale, string> = {
  th: 'บุคลากรในทีม',
  en: 'People in this team',
  zh: '团队人员',
  ja: 'チームメンバー',
}

export default function Teams({ title, locale = 'th' }: { title?: string; locale?: string } = {}) {
  const safeLocale: SupportedLocale = locale === 'en' || locale === 'zh' || locale === 'ja' ? locale : 'th'
  const copy = localizedCopy[safeLocale]
  const fieldGroups = safeLocale === 'th' ? copy.groups : translatedGroups[safeLocale]
  const supportGroups = supportNavigation[safeLocale]
  const navigation = [
    ...supportGroups.filter((group) => group.id === 'management').map((group) => ({ ...group, kind: 'support' as const })),
    ...fieldGroups.map((group) => ({ ...group, kind: 'field' as const })),
    ...supportGroups.filter((group) => group.id === 'marketing').map((group) => ({ ...group, kind: 'support' as const })),
  ]
  const [activeId, setActiveId] = useState<UnifiedTeamId>('management')
  const activeNavigation = navigation.find((group) => group.id === activeId) ?? navigation[0]
  const activeFieldGroup = fieldGroups.find((group) => group.id === activeId)
  const activePersonnelGroup = PERSONNEL_GROUPS.find((group) => group.id === activeId)

  return (
    <section className="teams-section" aria-labelledby="teams-section-title">
      <header className="teams-heading">
        <p className="teams-eyebrow">{copy.eyebrow}</p>
        <h2 id="teams-section-title" className="teams-title">{title ?? 'ทีมงาน สยามกราวด์วอเตอร์'}</h2>
        <p className="teams-intro">{copy.intro}</p>
      </header>

      <div className="teams-selector" role="tablist" aria-label={copy.selectorLabel}>
        {navigation.map((group) => {
          const isActive = group.id === activeNavigation.id
          return (
            <button
              key={group.id}
              type="button"
              className={isActive ? 'teams-selector-button is-active' : 'teams-selector-button'}
              role="tab"
              aria-selected={isActive}
              aria-controls={`team-panel-${group.id}`}
              id={`team-tab-${group.id}`}
              onClick={() => setActiveId(group.id as UnifiedTeamId)}
            >
              <span className="teams-selector-icon" aria-hidden="true">
                {group.kind === 'field'
                  ? <Image src={`${IMAGE_ROOT}/${group.icon}`} alt="" width={72} height={72} />
                  : group.icon === 'management' ? <BriefcaseBusiness /> : <Megaphone />}
              </span>
              <span className="teams-selector-copy">
                <strong>{group.label}</strong>
                <span>{group.shortLabel}</span>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          )
        })}
      </div>

      <article
        className="teams-panel"
        id={`team-panel-${activeNavigation.id}`}
        role="tabpanel"
        aria-labelledby={`team-tab-${activeNavigation.id}`}
      >
        <div className={activeFieldGroup ? 'teams-panel-overview' : 'teams-panel-overview is-support'}>
          <div className="teams-panel-identity">
            <div>
              <h3>{activeNavigation.label}</h3>
              <p>{activeNavigation.summary}</p>
            </div>
          </div>
          {activeFieldGroup && (
            <ul className="teams-highlights">
              {activeFieldGroup.highlights.map((highlight) => (
                <li key={highlight}><CheckCircle2 aria-hidden="true" />{highlight}</li>
              ))}
            </ul>
          )}
        </div>

        {activeFieldGroup && (
          <div className="teams-panel-columns">
            <FieldCollection title={copy.teamHeading} icon="team" items={activeFieldGroup.people} />
            <FieldCollection title={copy.equipmentHeading} icon="equipment" items={activeFieldGroup.equipment} />
          </div>
        )}

        {activePersonnelGroup && <PersonnelStructure group={activePersonnelGroup} locale={safeLocale} />}
      </article>
    </section>
  )
}

function PersonnelStructure({ group, locale }: { group: PersonnelGroup; locale: SupportedLocale }) {
  return (
    <section className="teams-personnel" aria-labelledby={`personnel-title-${group.id}`}>
      <div className="teams-personnel-heading">
        <UsersRound aria-hidden="true" />
        <h4 id={`personnel-title-${group.id}`}>{personnelHeadings[locale]}</h4>
      </div>
      <div className="personnel-group-body">
        {group.teams.map((team) => <PersonnelTeamCard team={team} key={team.name} />)}
      </div>
    </section>
  )
}

function PersonnelTeamCard({ team }: { team: PersonnelTeam }) {
  const leader = team.people.find((person) => person.role === 'leader')
  const members = team.people.filter((person) => person.role === 'member')

  return (
    <section className="personnel-team">
      <h4>{team.name}</h4>
      <div className="personnel-team-chart">
        {leader && <PersonCard person={leader} />}
        {leader && members.length > 0 && <span className="personnel-connector-vertical" aria-hidden="true" />}
        {members.length > 0 && (
          <>
            <span className="personnel-connector-horizontal" aria-hidden="true" />
            <div className="personnel-members">
              {members.map((member) => <PersonCard person={member} key={`${team.name}-${member.name}`} />)}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function PersonCard({ person }: { person: Person }) {
  return (
    <article className={person.role === 'leader' ? 'personnel-person is-leader' : 'personnel-person'}>
      <Image src={person.imageSrc} alt={person.name} width={72} height={72} />
      <div>
        <strong>{person.name}</strong>
        {person.title && <p>{person.title}</p>}
        {person.certificates.length > 0 && (
          <ul>
            {person.certificates.map((certificate) => <li key={certificate}>{certificate}</li>)}
          </ul>
        )}
      </div>
    </article>
  )
}

function FieldCollection({ title, icon, items }: { title: string; icon: 'team' | 'equipment'; items: FieldItem[] }) {
  const HeadingIcon = icon === 'team' ? HardHat : Wrench

  return (
    <section className="teams-collection">
      <h4><HeadingIcon aria-hidden="true" />{title}</h4>
      <div className="teams-item-grid">
        {items.map((item) => (
          <div className="teams-item" key={`${item.label}-${item.image}`}>
            <Image src={`${IMAGE_ROOT}/${item.image}`} alt="" width={112} height={112} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
