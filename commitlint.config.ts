import { RuleConfigSeverity } from '@commitlint/types';

const TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
  'release',
];
const SCOPES = ['core', 'floating-buttons', 'preferences', 'telemetry', 'wsp'];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [RuleConfigSeverity.Error, 'always', TYPES],
    'scope-enum': [RuleConfigSeverity.Error, 'always', SCOPES],
    'subject-case': [
      RuleConfigSeverity.Warning,
      'always',
      ['sentence-case', 'start-case'],
    ],
  },
};
