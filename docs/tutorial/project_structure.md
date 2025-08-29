# Project Directory Structure

This document provides a comprehensive overview of the my-own.fun Chrome extension project structure, helping developers understand the organization and architecture of the codebase.

## Overview

The my-own.fun Chrome extension is built with modern web technologies including React, TypeScript, and Vite. The project follows a well-organized structure that separates concerns and promotes maintainability.

## Root Directory Structure

```
gluonmeson-chrome-extension/
├── docs/                    # Documentation (docsify managed)
├── public/                  # Static assets
├── src/                     # Source code
├── test-utils/             # Testing utilities
├── utils/                   # Build and development utilities
├── dist/                    # Build output (generated)
├── node_modules/            # Dependencies (generated)
├── package.json             # Project configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
└── manifest.js              # Chrome extension manifest
```

## Core Source Code (`src/`)

### Main Entry Points

```
src/
├── background.js            # Service worker entry point
├── environment.d.ts         # Environment type definitions
├── global.d.ts              # Global type definitions
├── vite-env.d.ts            # Vite environment types
├── locales/                 # Internationalization files
│   ├── en-US.json          # English locale
│   └── zh-CN.json          # Chinese locale
└── types/                   # TypeScript type definitions
    └── types.d.ts           # Core type definitions
```

### Page Components (`src/pages/`)

The extension consists of several main pages, each serving different purposes:

#### 1. Popup (`src/pages/popup/`)
```
popup/
├── index.html               # Popup HTML template
├── index.css                # Popup styles
├── index.tsx                # Popup entry point
├── Popup.tsx                # Main popup component
└── agents/                  # Popup-specific agents
    └── BrowserCopilot.ts    # Browser copilot agent
```

#### 2. Side Panel (`src/pages/sidepanel/`)
```
sidepanel/
├── index.html               # Side panel HTML template
├── index.css                # Side panel styles
├── index.tsx                # Side panel entry point
├── SidePanel.tsx            # Main side panel component
├── agents/                  # Side panel agents
│   ├── BACopilotAgent.ts    # Business analysis copilot
│   ├── GoogleAgent.ts       # Google search agent
│   ├── MyFunCopilot.ts      # Main copilot agent
│   └── TranslateAgent.ts    # Translation agent
├── hooks/                   # Custom React hooks
│   └── use-chat-sessions.ts # Chat session management
└── store/                   # State management
    └── index.ts             # Store configuration
```

#### 3. Options Page (`src/pages/options/`)
The options page is a comprehensive web application with multiple modules:

```
options/
├── index.html               # Options page HTML template
├── index.css                # Options page styles
├── index.tsx                # Options page entry point
├── components/              # Shared options components
│   ├── MoreComing.tsx       # Placeholder component
│   └── NavSearch.tsx        # Navigation search
├── architect/               # Architecture tools module
│   ├── agents/              # Architecture agents
│   ├── components/          # Architecture components
│   ├── context/             # React context
│   ├── entities/            # Business entities
│   └── repositories/        # Data repositories
├── chatbot/                 # Chatbot module
│   ├── agents/              # Chatbot agents
│   └── components/          # Chatbot components
├── history/                 # History management module
│   └── components/          # History components
├── preference/              # Preferences module
│   └── components/          # Preference components
├── search/                  # Search module
│   ├── agents/              # Search agents
│   └── components/          # Search components
└── writer/                  # Writing assistant module
    ├── agents/              # Writing agents
    ├── components/          # Writing components
    ├── context/             # Writing context
    └── repositories/        # Writing repositories
```

#### 4. Content Scripts (`src/pages/content/`)
```
content/
├── injected/                # Injected content scripts
│   ├── listeners/           # Event listeners
│   │   ├── common/          # Common listeners
│   │   ├── trello/          # Trello integration
│   │   └── utils/           # Listener utilities
│   └── utils/               # Injection utilities
└── ui/                      # Content UI components
    └── FloatingBall.tsx     # Floating action button
```

### Shared Components (`src/shared/`)

The shared directory contains reusable components and utilities:

```
shared/
├── agents/                  # AI agent system
│   ├── core/                # Core agent classes
│   │   ├── errors/          # Error handling
│   │   ├── ChatMessage.ts   # Chat message model
│   │   ├── Conversation.ts  # Conversation model
│   │   ├── Interaction.ts   # Interaction model
│   │   ├── Step.ts          # Step model
│   │   ├── Thought.ts       # Thought model
│   │   └── ToolDefinition.ts # Tool definition model
│   ├── decorators/          # Agent decorators
│   │   ├── entity.ts        # Entity decorator
│   │   └── tool.ts          # Tool decorator
│   ├── services/            # Agent services
│   │   ├── ContextTransformer.ts # Context transformation
│   │   ├── DefaultModelService.ts # Base model service
│   │   ├── OllamaModelService.ts  # Ollama integration
│   │   ├── PromptChainOfThoughtService.ts # Chain of thought
│   │   ├── PromptTemplate.ts      # Prompt templating
│   │   └── TemplateEngine.ts      # Template engine
│   ├── CompositeAgent.ts    # Composite agent
│   └── ThoughtAgent.ts      # Thought-based agent
├── components/               # Reusable UI components
│   ├── ChatConversation/    # Chat conversation component
│   ├── MarkdownTextArea/    # Markdown text area
│   └── Message/             # Message components
│       ├── MarkDownBlock/   # Markdown block rendering
│       └── UserMessage/     # User message component
├── configurers/              # Configuration utilities
├── hoc/                      # Higher-order components
├── hooks/                    # Custom React hooks
├── repositories/             # Data access layer
├── services/                 # Business services
├── storages/                 # Storage utilities
├── utils/                    # Utility functions
└── webpage/                  # Web page utilities
```

## Build and Development Utilities (`utils/`)

```
utils/
├── manifest-parser/          # Manifest parsing utilities
├── plugins/                  # Build plugins
│   ├── add-hmr.ts           # Hot module replacement
│   ├── custom-dynamic-import.ts # Dynamic import handling
│   ├── inline-vite-preload-script.ts # Preload script injection
│   ├── make-manifest.ts     # Manifest generation
│   └── watch-rebuild.ts     # Watch and rebuild
├── reload/                   # Development reload system
│   ├── injections/          # Injection scripts
│   ├── interpreter/         # Interpreter utilities
│   ├── initReloadClient.ts  # Reload client
│   ├── initReloadServer.js  # Reload server
│   ├── rollup.config.mjs    # Rollup configuration
│   └── utils.ts             # Reload utilities
└── vite.ts                  # Vite configuration utilities
```

## Testing (`test-utils/`)

```
test-utils/
└── vitest.setup.js          # Vitest test setup
```

## Static Assets (`public/`)

```
public/
└── icons/                   # Extension icons
    ├── logo.png             # Main logo
    ├── logo.svg             # Vector logo
    └── user-icon.png        # User avatar
```

## Documentation (`docs/`)

```
docs/
├── _navbar.md               # Navigation bar configuration
├── _sidebar.md              # Sidebar navigation
├── index.html               # Documentation entry point
├── README.md                # Documentation overview
├── concepts/                # Conceptual documentation
├── images/                  # Documentation images
├── tasking/                 # Task-related documentation
├── tutorial/                # Tutorial documentation
└── zh-cn/                   # Chinese documentation
```

## Configuration Files

### Package Management
- **`package.json`**: Project dependencies and scripts
- **`pnpm-lock.yaml`**: Dependency lock file

### Build Configuration
- **`vite.config.ts`**: Vite build configuration
- **`tsconfig.json`**: TypeScript compiler options
- **`manifest.js`**: Chrome extension manifest generation

### Code Quality
- **`.eslintrc.js`**: ESLint configuration
- **`.prettierrc`**: Prettier formatting rules
- **`.husky/`**: Git hooks for pre-commit checks

## Key Architectural Patterns

### 1. Agent-Based Architecture
The project uses an agent-based architecture where different AI agents handle specific tasks:
- **CompositeAgent**: Orchestrates other agents
- **ThoughtAgent**: Implements chain-of-thought reasoning
- **Specialized Agents**: Handle specific domains (search, translation, writing)

### 2. Service Layer
Services provide business logic and external integrations:
- **Model Services**: Handle different AI model providers
- **Context Transformation**: Convert conversations to chat messages
- **Template Engine**: Handle prompt templating

### 3. Component Architecture
React components are organized by:
- **Page-level components**: Main application views
- **Shared components**: Reusable UI elements
- **Feature-specific components**: Domain-specific functionality

### 4. Data Flow
```
User Input → Agent → Service → Model → Response → UI Update
```

## Development Workflow

### Building
```bash
# Development build with hot reload
pnpm dev

# Production build
pnpm build

# Firefox-specific build
pnpm build:firefox
```

### Testing
```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch
```

### Code Quality
```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm prettier
```

## File Naming Conventions

- **Components**: PascalCase (e.g., `Popup.tsx`)
- **Utilities**: camelCase (e.g., `manifest-parser`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `__FIREFOX__`)
- **Directories**: kebab-case (e.g., `content-injected`)

## Dependencies

### Core Technologies
- **React 18.2.0**: UI framework
- **TypeScript 5.2.2**: Type safety
- **Vite 5.0.12**: Build tool and dev server

### UI Libraries
- **Ant Design 5.16.5**: Component library
- **Bootstrap 5.3.3**: CSS framework
- **Emotion**: CSS-in-JS styling

### AI and Integration
- **OpenAI 4.39.0**: AI model integration
- **Mermaid 11.4.0**: Diagram rendering
- **LiquidJS**: Template engine

### Development Tools
- **Vitest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks

## Browser Compatibility

The extension is designed to work with:
- **Chrome**: Primary target
- **Firefox**: Secondary target (with specific build)
- **Edge**: Chrome-compatible browsers

## Performance Considerations

- **Code Splitting**: Vite automatically splits code into chunks
- **Tree Shaking**: Unused code is eliminated during build
- **Lazy Loading**: Components are loaded on demand
- **Bundle Optimization**: Rollup optimizes the final bundle

This directory structure provides a solid foundation for a maintainable and scalable Chrome extension, with clear separation of concerns and modern development practices.
