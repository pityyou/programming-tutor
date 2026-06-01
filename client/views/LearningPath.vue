<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../src/stores/app'

const router = useRouter()
const store = useAppStore()
if (!store.isLoggedIn) router.replace('/login')

interface Stage {
  title: string
  desc: string
  topics: string[]
  icon: string
}

const languages = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'javascript', label: 'JavaScript', icon: '📜' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'cpp', label: 'C++', icon: '⚡' },
  { value: 'c', label: 'C', icon: '🔧' },
  { value: 'csharp', label: 'C#', icon: '🎯' },
  { value: 'go', label: 'Go', icon: '🔵' },
]

const paths: Record<string, Stage[]> = {
  python: [
    { title: '入门', desc: 'Hello World、变量、输入输出', icon: '🚀', topics: ['变量与数据类型', '输入输出', '基本运算'] },
    { title: '基础', desc: '条件、循环、函数', icon: '📖', topics: ['条件判断', 'for/while循环', '函数定义与参数'] },
    { title: '数据结构', desc: '列表、字典、集合', icon: '🗂️', topics: ['列表与元组', '字典与集合', '字符串操作'] },
    { title: '进阶', desc: '推导式、装饰器、生成器', icon: '⚡', topics: ['列表推导式', '装饰器', '生成器与迭代器'] },
    { title: '面向对象', desc: '类、继承、魔术方法', icon: '🏗️', topics: ['类与对象', '继承与多态', '魔术方法'] },
    { title: '实战', desc: '文件操作、异常处理、模块', icon: '🛠️', topics: ['文件操作', '异常处理', '常用模块'] },
  ],
  javascript: [
    { title: '入门', desc: '变量、类型、运算符', icon: '🚀', topics: ['变量声明', '数据类型', '运算符'] },
    { title: '基础', desc: '函数、数组、对象', icon: '📖', topics: ['函数', '数组方法', '对象与解构'] },
    { title: '异步', desc: 'Promise、async/await', icon: '⏳', topics: ['Promise', 'async/await', 'fetch API'] },
    { title: 'DOM', desc: 'DOM操作、事件处理', icon: '🖥️', topics: ['DOM查询与操作', '事件处理', '事件委托'] },
  ],
  java: [
    { title: '入门', desc: 'Hello World、基本结构', icon: '🚀', topics: ['基本结构', '变量与数据类型', '运算符'] },
    { title: '基础', desc: '控制流程、数组、字符串', icon: '📖', topics: ['控制流程', '数组', 'String操作'] },
    { title: '面向对象', desc: '类、继承、接口、多态', icon: '🏗️', topics: ['类与对象', '继承与多态', '接口与抽象类'] },
    { title: '集合框架', desc: 'List、Set、Map、Stream', icon: '🗂️', topics: ['ArrayList/LinkedList', 'HashMap/TreeMap', 'Stream API'] },
    { title: '进阶', desc: '泛型、异常、IO', icon: '⚡', topics: ['泛型', '异常处理', '文件IO'] },
  ],
  cpp: [
    { title: '入门', desc: 'Hello World、I/O、变量', icon: '🚀', topics: ['基本结构', '变量与类型', '输入输出'] },
    { title: '基础', desc: '控制流、数组、指针', icon: '📖', topics: ['控制流程', '数组', '指针与引用'] },
    { title: '面向对象', desc: '类、继承、虚函数', icon: '🏗️', topics: ['类与封装', '继承', '虚函数与多态'] },
    { title: 'STL', desc: 'vector、map、算法', icon: '🗂️', topics: ['STL容器', '算法库', '迭代器'] },
    { title: '高级', desc: '智能指针、移动语义', icon: '⚡', topics: ['智能指针', '移动语义', 'lambda与auto'] },
  ],
  c: [
    { title: '入门', desc: 'Hello World、数据类型', icon: '🚀', topics: ['基本结构', '数据类型', '输入输出'] },
    { title: '基础', desc: '控制流、数组、函数', icon: '📖', topics: ['控制流程', '数组', '函数'] },
    { title: '指针', desc: '指针、动态内存', icon: '🔑', topics: ['指针深入', '指针算术', '动态内存分配'] },
    { title: '高级', desc: '结构体、文件操作', icon: '⚡', topics: ['struct与union', '文件操作', '预处理器'] },
  ],
  csharp: [
    { title: '入门', desc: 'Hello World、类型系统', icon: '🚀', topics: ['基本结构', '数据类型', '字符串'] },
    { title: '基础', desc: '控制流、集合、LINQ', icon: '📖', topics: ['控制流程', 'List/Dictionary', 'LINQ查询'] },
    { title: '面向对象', desc: '类、属性、继承、接口', icon: '🏗️', topics: ['类与属性', '继承与多态', '接口'] },
    { title: '异步', desc: 'async/await、Task', icon: '⏳', topics: ['Task', 'async/await', '异常处理'] },
  ],
  go: [
    { title: '入门', desc: 'Hello World、变量、类型', icon: '🚀', topics: ['包与导入', '变量与类型', '控制流程'] },
    { title: '基础', desc: '函数、slice、map、struct', icon: '📖', topics: ['函数与多返回值', 'slice与map', 'struct'] },
    { title: '并发', desc: 'goroutine、channel', icon: '⚡', topics: ['Goroutine', 'Channel', 'select'] },
    { title: '进阶', desc: '接口、错误处理、defer', icon: '🏗️', topics: ['interface', 'error处理', 'defer/panic/recover'] },
  ],
}

const selectedLang = ref('python')

function goToKnowledge(lang: string, topic: string) {
  localStorage.setItem('nav_to_knowledge', JSON.stringify({ lang, topic }))
  router.push('/chat')
}
</script>

<template>
  <div class="lp-page">
    <header class="topbar">
      <span class="logo" @click="router.push('/chat')" style="cursor:pointer">编程助学智能体</span>
      <div class="topbar-right">
        <button class="back-btn" @click="router.push('/chat')">← 返回</button>
        <span class="user-info">{{ store.user?.username }}</span>
      </div>
    </header>

    <div class="lp-content">
      <h1>学习路径</h1>
      <div class="lang-tabs">
        <button v-for="l in languages" :key="l.value"
          :class="['lang-tab', { active: selectedLang === l.value }]"
          @click="selectedLang = l.value">
          {{ l.icon }} {{ l.label }}
        </button>
      </div>

      <div class="stages">
        <div v-for="(stage, i) in paths[selectedLang] || []" :key="i" class="stage-card">
          <div class="stage-num">{{ i + 1 }}</div>
          <div class="stage-body">
            <div class="stage-header">
              <span class="stage-icon">{{ stage.icon }}</span>
              <span class="stage-title">{{ stage.title }}</span>
            </div>
            <p class="stage-desc">{{ stage.desc }}</p>
            <div class="stage-topics">
              <span v-for="t in stage.topics" :key="t" class="topic-tag" @click="goToKnowledge(selectedLang, t)">{{ t }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lp-page { min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); }
.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-primary);
}
.logo { font-size: 18px; font-weight: 700; color: var(--accent); }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.user-info { color: var(--text-secondary); font-size: 13px; }
.back-btn {
  padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border-secondary);
  background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; cursor: pointer;
}
.lp-content { max-width: 700px; margin: 0 auto; padding: 24px 20px; }
h1 { font-size: 22px; margin-bottom: 16px; }
.lang-tabs { display: flex; gap: 4px; margin-bottom: 24px; flex-wrap: wrap; }
.lang-tab {
  padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-secondary);
  background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer;
}
.lang-tab.active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
.stages { display: flex; flex-direction: column; gap: 12px; }
.stage-card { display: flex; gap: 16px; align-items: flex-start; }
.stage-num {
  width: 36px; height: 36px; border-radius: 50%; background: var(--accent);
  color: var(--accent-text); display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; flex-shrink: 0;
}
.stage-body { flex: 1; background: var(--bg-secondary); border-radius: 10px; padding: 16px; }
.stage-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.stage-icon { font-size: 20px; }
.stage-title { font-size: 16px; font-weight: 700; }
.stage-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; }
.stage-topics { display: flex; flex-wrap: wrap; gap: 6px; }
.topic-tag {
  padding: 3px 10px; border-radius: 12px; border: 1px solid var(--border-secondary);
  font-size: 11px; color: var(--accent); cursor: pointer;
  transition: all 0.2s;
}
.topic-tag:hover {
  background: var(--accent); color: var(--accent-text);
}
</style>
