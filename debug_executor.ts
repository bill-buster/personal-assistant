import * as fs from 'fs';
import * as path from 'path';
import { Executor } from './src/core/executor';
import { createNodeToolRegistry } from './src/core/tool_registry';
import { Agent } from './src/core/types';

const baseDir = '/tmp/debug-exec';
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

const perms = {
    version: 1,
    allow_paths: ['.'],
    allow_commands: ['ls'],
    require_confirmation_for: [],
    deny_tools: [],
};
fs.writeFileSync(path.join(baseDir, 'permissions.json'), JSON.stringify(perms));

const agent: Agent = {
    name: 'System',
    tools: ['write_file'],
    kind: 'system',
    description: 'desc',
    systemPrompt: 'prompt',
};

const config = {
    baseDir,
    limits: { maxReadSize: 1000, maxWriteSize: 1000 },
    permissionsPath: path.join(baseDir, 'permissions.json'),
    agent: agent,
    registry: createNodeToolRegistry(),
};

const exec = new Executor(config);
exec.execute('write_file', { path: 'test.txt', content: 'test' })
    .then(res => console.log('Result:', JSON.stringify(res, null, 2)))
    .catch(err => console.error('Error:', err));
