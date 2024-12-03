# Contributing to Photo ZIP Manager

Thank you for your interest in contributing to Photo ZIP Manager! This document provides guidelines and steps for contributing to the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables (copy `.env.example` and fill in the values):
```bash
cp .env.example .env
```
4. Start the development server:
```bash
npm run dev
```

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow the existing code style and formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Component Guidelines
- Use functional components with hooks
- Follow the component structure in `client/src/components`
- Use Shadcn UI components where possible
- Implement proper error handling and loading states

### Testing
- Write tests for new features
- Ensure existing tests pass before submitting PR
- Test across different browsers and screen sizes

### Git Workflow
1. Create a new branch from `main`:
```bash
git checkout -b feature/your-feature-name
```
2. Make your changes and commit them:
```bash
git commit -m "feat: add new feature"
```
3. Push to your fork:
```bash
git push origin feature/your-feature-name
```
4. Create a Pull Request

### Commit Message Format
Follow conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the documentation if you're changing functionality
3. Reference any related issues in your PR description
4. Wait for review from maintainers
5. Address any requested changes
6. Once approved, your PR will be merged

## Questions?

If you have questions about contributing, please open an issue with the "question" label.

Thank you for contributing to Photo ZIP Manager!
