import assert from 'node:assert/strict'
import test from 'node:test'
import { selectNearbyProjects } from '../src/lib/nearby-projects.ts'

const current = { _id: 'current', lat: 13.7563, lng: 100.5018 }

test('nearby projects are ordered geographically and exclude the current project', () => {
  const projects = [
    { _id: 'chiang-mai', lat: 18.7883, lng: 98.9853 },
    { _id: 'current', lat: 13.7563, lng: 100.5018 },
    { _id: 'nonthaburi', lat: 13.8621, lng: 100.5144 },
    { _id: 'pathum-thani', lat: 14.0208, lng: 100.525 },
    { _id: 'nakhon-pathom', lat: 13.8199, lng: 100.0622 },
  ]

  assert.deepEqual(
    selectNearbyProjects(current, projects).map((project) => project._id),
    ['nonthaburi', 'pathum-thani', 'nakhon-pathom']
  )
})

test('projects without usable coordinates are excluded', () => {
  const projects = [
    { _id: 'missing', lat: null, lng: null },
    { _id: 'invalid', lat: 95, lng: 100 },
    { _id: 'valid', lat: 13.8, lng: 100.5 },
  ]

  assert.deepEqual(
    selectNearbyProjects(current, projects).map((project) => project._id),
    ['valid']
  )
  assert.deepEqual(selectNearbyProjects({ _id: 'none', lat: null, lng: null }, projects), [])
})

test('the result limit is respected', () => {
  const projects = [
    { _id: 'one', lat: 13.76, lng: 100.5 },
    { _id: 'two', lat: 13.77, lng: 100.5 },
  ]

  assert.deepEqual(
    selectNearbyProjects(current, projects, 1).map((project) => project._id),
    ['one']
  )
  assert.deepEqual(selectNearbyProjects(current, projects, 0), [])
})
