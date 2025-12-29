/**
 * Docker configuration tests
 * These tests verify Docker-related files exist and are properly configured
 */

import fs from 'fs';
import path from 'path';

describe('Docker Configuration', () => {
  const rootDir = process.cwd();

  describe('Dockerfile', () => {
    const dockerfilePath = path.join(rootDir, 'Dockerfile');

    test('Dockerfile exists', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    test('Dockerfile has multi-stage build', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('FROM node:20-alpine AS deps');
      expect(content).toContain('FROM node:20-alpine AS builder');
      expect(content).toContain('FROM node:20-alpine AS runner');
    });

    test('Dockerfile runs as non-root user', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('USER nextjs');
    });

    test('Dockerfile has health check', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('HEALTHCHECK');
    });

    test('Dockerfile exposes port 3000', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('EXPOSE 3000');
    });

    test('Dockerfile uses standalone output', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('.next/standalone');
    });
  });

  describe('Dockerfile.dev', () => {
    const dockerfileDevPath = path.join(rootDir, 'Dockerfile.dev');

    test('Dockerfile.dev exists', () => {
      expect(fs.existsSync(dockerfileDevPath)).toBe(true);
    });

    test('Dockerfile.dev uses npm run dev', () => {
      const content = fs.readFileSync(dockerfileDevPath, 'utf-8');
      expect(content).toContain('npm');
      expect(content).toContain('dev');
    });
  });

  describe('docker-compose.yml', () => {
    const composePath = path.join(rootDir, 'docker-compose.yml');

    test('docker-compose.yml exists', () => {
      expect(fs.existsSync(composePath)).toBe(true);
    });

    test('docker-compose.yml has production service', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toContain('email-validator:');
    });

    test('docker-compose.yml has dev service', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toContain('email-validator-dev:');
    });

    test('docker-compose.yml has healthcheck', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toContain('healthcheck:');
    });
  });

  describe('.dockerignore', () => {
    const dockerignorePath = path.join(rootDir, '.dockerignore');

    test('.dockerignore exists', () => {
      expect(fs.existsSync(dockerignorePath)).toBe(true);
    });

    test('.dockerignore excludes node_modules', () => {
      const content = fs.readFileSync(dockerignorePath, 'utf-8');
      expect(content).toContain('node_modules');
    });

    test('.dockerignore excludes .next', () => {
      const content = fs.readFileSync(dockerignorePath, 'utf-8');
      expect(content).toContain('.next');
    });

    test('.dockerignore excludes test files', () => {
      const content = fs.readFileSync(dockerignorePath, 'utf-8');
      expect(content).toContain('*.test.ts');
    });
  });

  describe('next.config.js', () => {
    const configPath = path.join(rootDir, 'next.config.js');

    test('next.config.js exists', () => {
      expect(fs.existsSync(configPath)).toBe(true);
    });

    test('next.config.js has standalone output', () => {
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain("output: 'standalone'");
    });
  });

  describe('package.json Docker scripts', () => {
    const packageJsonPath = path.join(rootDir, 'package.json');

    test('package.json has docker:build script', () => {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(content.scripts['docker:build']).toBeDefined();
    });

    test('package.json has docker:run script', () => {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(content.scripts['docker:run']).toBeDefined();
    });

    test('package.json has docker:dev script', () => {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(content.scripts['docker:dev']).toBeDefined();
    });

    test('package.json has docker:prod script', () => {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(content.scripts['docker:prod']).toBeDefined();
    });

    test('package.json has docker:stop script', () => {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(content.scripts['docker:stop']).toBeDefined();
    });
  });
});
