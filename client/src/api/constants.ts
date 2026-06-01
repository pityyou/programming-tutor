export const MODEL_OPTIONS: Record<string, { label: string; models: { value: string; label: string }[] }> = {
  deepseek: {
    label: 'DeepSeek',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek-V3' },
      { value: 'deepseek-reasoner', label: 'DeepSeek-R1' },
    ],
  },
}

export const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
]

export const HELLO_WORLD: Record<string, string> = {
  python: '# Python Hello World\nprint("Hello, World!")\n',
  javascript: '// JavaScript Hello World\nconsole.log("Hello, World!");\n',
  java: '// Java Hello World\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  cpp: '// C++ Hello World\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
  c: '// C Hello World\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
  go: '// Go Hello World\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
}
