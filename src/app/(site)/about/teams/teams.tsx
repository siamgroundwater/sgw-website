'use client'

import { useState } from 'react'
import Image from 'next/image'
import './teams.css'
import teamGroupsJson from './teams.json'

type Person = {
  name: string
  role: 'leader' | 'member'
  title?: string
  certificates: string[]
  imageSrc: string
}

type Team = {
  name: string
  people: Person[]
}

type TeamGroup = {
  id: string
  label: string
  summary: string
  teams: Team[]
}

// Cast JSON into typed structure
const TEAM_GROUPS = teamGroupsJson as TeamGroup[]

export default function Teams({ title }: { title?: string } = {}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    TEAM_GROUPS.forEach((group) => {
      initial[group.id] = false
    })
    return initial
  })

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }


  return (
    <section className="teams-section">
      <h2 className="teams-title">{title ?? 'ทีมงาน สยามกราวด์วอเตอร์'}</h2>

      {/* Org-chart style groups */}
      <div className="teams-groups">
        {TEAM_GROUPS.map((group) => (
          <div
            key={group.id}
            id={`teams-group-${group.id}`}
            className="teams-group-card"
          >
            <div className="teams-group-header">
              <button
                type="button"
                className="teams-group-toggle"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={openGroups[group.id]}
                aria-controls={`teams-group-body-${group.id}`}
              >
                <div className="teams-group-toggle-inner">
                  <span className="teams-group-title">{group.label}</span>
                  <span
                    className={
                      openGroups[group.id]
                        ? 'teams-group-toggle-icon open'
                        : 'teams-group-toggle-icon'
                    }
                  >
                    ▾
                  </span>
                </div>
                <span className="teams-group-summary">{group.summary}</span>
              </button>
            </div>

            {openGroups[group.id] && (
              <div
                className="teams-group-body"
                id={`teams-group-body-${group.id}`}
              >
                {group.teams.map((team) => {
                  const leader = team.people.find((p) => p.role === 'leader')
                  const members = team.people.filter((p) => p.role === 'member')

                  return (
                    <div key={team.name} className="org-team">
                      <div className="org-team-header">
                        <span className="org-team-name">{team.name}</span>
                      </div>

                      <div className="org-team-chart">
                        {/* Leader row */}
                        {leader && (
                          <div className="org-leader-row">
                            <PersonCard person={leader} />
                          </div>
                        )}

                        {/* Vertical connector */}
                        {leader && members.length > 0 && (
                          <div className="org-connector-vertical" />
                        )}

                        {/* Members row */}
                        {members.length > 0 && (
                          <>
                            <div className="org-connector-horizontal" />
                            <div className="org-members-row">
                              {members.map((member) => (
                                <PersonCard
                                  key={`${team.name}-${member.name}`}
                                  person={member}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function PersonCard({ person }: { person: Person }) {
  const isLeader = person.role === 'leader'

  return (
    <div
      className={`org-person-card ${
        isLeader ? 'org-person-card-leader' : 'org-person-card-member'
      }`}
    >
      <div className="org-person-avatar">
        <Image
          src={person.imageSrc}
          alt={person.name}
          width={72}
          height={72}
          className="org-person-avatar-image"
        />
      </div>
      <div className="org-person-info">
        <div className="org-person-top">
          <span className="org-person-name">{person.name}</span>
        </div>
        {person.title && <p className="org-person-title">{person.title}</p>}
        {person.certificates.length > 0 && (
          <ul className="org-cert-list">
            {person.certificates.map((cert) => (
              <li key={cert}>{cert}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
