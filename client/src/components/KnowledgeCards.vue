<script setup lang="ts">
import { ref, computed, onMounted } from "vue"

const emit = defineEmits<{
  'ask-ai': [prompt: string]
  'open-in-editor': [code: string, language: string]
}>()

interface Card {
  id: string
  title: string
  content: string
  example: string
  language: string
}

function bilibiliUrl(keyword: string) {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}&order=click`
}

const languages = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'javascript', label: 'JavaScript', icon: '📜' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'cpp', label: 'C++', icon: '⚡' },
  { value: 'c', label: 'C', icon: '🔧' },
  { value: 'go', label: 'Go', icon: '🔵' },
  { value: 'algo', label: '算法', icon: '🧮' },
]

const cards: Record<string, { topic: string; items: Card[] }[]> = {
  python: [
    {
      topic: '基础语法',
      items: [
        { id: 'py-1', title: '变量与数据类型', language: 'python', content: 'Python 是动态类型语言，变量无需声明类型。常见类型：`int`、`float`、`str`、`bool`、`list`、`tuple`、`dict`、`set`。使用 `type()` 可查看类型，`isinstance()` 判断类型。', example: '# 变量赋值\nname = "Alice"\nage = 20\nscore = 95.5\nis_pass = True\n\n# 类型检查\nprint(type(name))     # <class \'str\'>\nprint(isinstance(age, int))  # True\n\n# 类型转换\nnum_str = "123"\nnum = int(num_str)    # 字符串转整数' },
        { id: 'py-2', title: '字符串操作', language: 'python', content: 'Python 字符串支持切片、格式化、常用方法。f-string（Python 3.6+）是最推荐的格式化方式。常见方法：`split()`、`join()`、`replace()`、`strip()`、`upper()`/`lower()`。', example: '# 字符串操作\ns = "  Hello, World!  "\nprint(s.strip())       # "Hello, World!"\nprint(s.upper())       # "  HELLO, WORLD!  "\nprint(s.replace("World", "Python"))  \n\n# f-string 格式化\nname = "小明"\nscore = 95\nprint(f"{name} 的成绩是 {score} 分")\n\n# 切片\nprint(s[2:7])          # "Hello"' },
        { id: 'py-3', title: '条件与循环', language: 'python', content: '`if-elif-else` 控制分支，`for`/`while` 控制循环。Python 的 `for` 遍历可迭代对象，配合 `range()`、`enumerate()`、`zip()` 使用。`break` 跳出循环，`continue` 跳过本次。', example: '# 条件判断\nscore = 85\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 60:\n    grade = "C"\nelse:\n    grade = "D"\n\n# for 循环\nfruits = ["苹果", "香蕉", "橘子"]\nfor i, fruit in enumerate(fruits):\n    print(f"{i}: {fruit}")\n\n# while 循环\ncount = 0\nwhile count < 3:\n    print(count)\n    count += 1' },
        { id: 'py-4', title: '函数定义', language: 'python', content: '用 `def` 定义函数。支持默认参数、关键字参数、可变参数（`*args` 位置参数元组、`**kwargs` 关键字参数字典）。使用 `return` 返回值，可返回多个值。', example: 'def greet(name, greeting="你好"):\n    return f"{greeting}，{name}！"\n\n# 默认参数\nprint(greet("小明"))          # 你好，小明！\nprint(greet("小红", "Hello")) # Hello，小红！\n\n# 可变参数\ndef sum_all(*args):\n    return sum(args)\n\nprint(sum_all(1, 2, 3, 4))   # 10\n\n# 关键字参数\ndef info(**kwargs):\n    for k, v in kwargs.items():\n        print(f"{k}: {v}")' },
        { id: 'py-5', title: '列表与元组', language: 'python', content: '`list` 是有序可变序列，支持增删改查、切片、排序。`tuple` 是不可变序列，适合存储不应被修改的数据。常用方法：`append()`、`extend()`、`insert()`、`remove()`、`pop()`、`sort()`。', example: '# 列表操作\nnumbers = [3, 1, 4, 1, 5]\nnumbers.append(9)        # 末尾添加\nnumbers.sort()            # 排序\nprint(numbers)            # [1, 1, 3, 4, 5, 9]\n\n# 列表切片\nprint(numbers[1:4])       # [1, 3, 4]\nprint(numbers[::-1])      # 反转\n\n# 元组（不可变）\npoint = (3, 4)\nx, y = point              # 元组解包\nprint(f"({x}, {y})")' },
        { id: 'py-6', title: '字典与集合', language: 'python', content: '`dict` 是键值对映射（Python 3.7+ 有序）。`set` 是无序不重复元素集合，支持交集、并集、差集运算。常用方法：`get()`、`items()`、`keys()`、`values()`、`update()`。', example: '# 字典\nstudent = {"name": "小明", "age": 18, "score": 95}\nstudent["city"] = "北京"\nprint(student.get("name", "未知"))  # 小明\n\nfor key, value in student.items():\n    print(f"{key}: {value}")\n\n# 集合\na = {1, 2, 3, 4}\nb = {3, 4, 5, 6}\nprint(a & b)   # 交集: {3, 4}\nprint(a | b)   # 并集: {1, 2, 3, 4, 5, 6}\nprint(a - b)   # 差集: {1, 2}' },
      ],
    },
    {
      topic: '进阶特性',
      items: [
        { id: 'py-7', title: '列表推导式', language: 'python', content: '推导式（Comprehension）是创建列表/字典/集合的简洁语法。支持嵌套和条件过滤。相比 `map`+`filter` 更 Pythonic。', example: '# 列表推导式\nsquares = [x**2 for x in range(10)]\nevens = [x for x in range(20) if x % 2 == 0]\n\n# 字典推导式\nword = "hello"\nfreq = {c: word.count(c) for c in word}\n\n# 集合推导式\nunique_lens = {len(w) for w in ["hi", "hello", "hey"]}\n\n# 嵌套推导式\nmatrix = [[i+j for j in range(3)] for i in range(3)]' },
        { id: 'py-8', title: '装饰器', language: 'python', content: '装饰器（Decorator）接收函数并返回新函数，为原函数增加功能而不修改其代码。可用于日志、计时、权限检查。Python 提供 `@functools.wraps` 保留原函数元信息。', example: 'import functools\nimport time\n\ndef timer(func):\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        start = time.time()\n        result = func(*args, **kwargs)\n        elapsed = time.time() - start\n        print(f"{func.__name__} 耗时: {elapsed:.3f}s")\n        return result\n    return wrapper\n\n@timer\ndef slow(n):\n    return sum(range(n))\n\nslow(10000000)' },
        { id: 'py-9', title: '生成器与迭代器', language: 'python', content: '生成器（Generator）用 `yield` 关键字惰性产出值，节省内存。迭代器（Iterator）实现了 `__iter__` 和 `__next__`。`itertools` 模块提供丰富的迭代器工具。', example: '# 生成器函数\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nfor num in fibonacci(10):\n    print(num, end=" ")  # 0 1 1 2 3 5 8 13 21 34\n\n# 生成器表达式\ngen = (x**2 for x in range(1000000))  # 不占用内存\nprint(next(gen))  # 0\nprint(next(gen))  # 1' },
        { id: 'py-10', title: '异常处理', language: 'python', content: '`try-except-else-finally` 处理异常。`raise` 抛出异常。可以用 `with` 语句管理资源（上下文管理器），自动清理。自定义异常需继承 `Exception`。', example: '# 异常处理\ntry:\n    num = int(input("输入数字: "))\n    result = 100 / num\nexcept ValueError:\n    print("请输入有效数字")\nexcept ZeroDivisionError:\n    print("不能除以零")\nelse:\n    print(f"结果: {result}")\nfinally:\n    print("程序结束")\n\n# with 语句（上下文管理器）\nwith open("test.txt", "r") as f:\n    content = f.read()' },
        { id: 'py-11', title: 'lambda 与高阶函数', language: 'python', content: '`lambda` 创建匿名函数，适用于简单操作。`map()`、`filter()`、`reduce()` 是高阶函数。`sorted()` 的 `key` 参数常用 lambda。', example: '# lambda 表达式\nsquare = lambda x: x ** 2\nprint(square(5))  # 25\n\n# map 和 filter\nnums = [1, 2, 3, 4, 5]\nsquared = list(map(lambda x: x**2, nums))\nevens = list(filter(lambda x: x % 2 == 0, nums))\n\n# sorted 的 key 参数\nstudents = [("小明", 85), ("小红", 95), ("小刚", 72)]\nranked = sorted(students, key=lambda s: s[1], reverse=True)\nprint(ranked)  # [("小红", 95), ...]' },
      ],
    },
    {
      topic: '面向对象',
      items: [
        { id: 'py-12', title: '类与对象', language: 'python', content: '`class` 定义类，`__init__` 是构造方法，`self` 指向实例。支持公有/私有（`_`前缀约定）、`@property` 装饰器、`@classmethod`、`@staticmethod`。', example: 'class Student:\n    school = "清华"           # 类变量\n    \n    def __init__(self, name, age):\n        self.name = name       # 实例变量\n        self._age = age        # 约定私有\n    \n    @property\n    def age(self):\n        return self._age\n    \n    def introduce(self):\n        return f"我是{self.name}，{self.age}岁"\n\ns1 = Student("小明", 18)\nprint(s1.introduce())' },
        { id: 'py-13', title: '继承与多态', language: 'python', content: 'Python 支持单继承和多继承。`super()` 调用父类方法。方法重写实现多态。MRO（方法解析顺序）决定了多继承中的调用顺序。', example: 'class Animal:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        raise NotImplementedError\n\nclass Dog(Animal):\n    def speak(self):\n        return f"{self.name}: 汪汪！"\n\nclass Cat(Animal):\n    def speak(self):\n        return f"{self.name}: 喵喵！"\n\nanimals = [Dog("旺财"), Cat("咪咪")]\nfor a in animals:\n    print(a.speak())  # 多态' },
        { id: 'py-14', title: '魔术方法', language: 'python', content: '魔术方法（dunder methods）以双下划线开头结尾：`__str__`、`__repr__`、`__eq__`、`__lt__`、`__add__`、`__len__`、`__getitem__` 等，让自定义类支持 Python 内置操作。', example: 'class Vector:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n    \n    def __str__(self):\n        return f"Vector({self.x}, {self.y})"\n    \n    def __add__(self, other):\n        return Vector(self.x + other.x, self.y + other.y)\n    \n    def __eq__(self, other):\n        return self.x == other.x and self.y == other.y\n    \n    def __len__(self):\n        return 2\n\nv1 = Vector(1, 2)\nv2 = Vector(3, 4)\nprint(v1 + v2)  # Vector(4, 6)\nprint(v1 == v2)  # False' },
      ],
    },
    {
      topic: '常用模块',
      items: [
        { id: 'py-15', title: '文件操作', language: 'python', content: '`open()` 打开文件，支持 `r`(读)、`w`(写)、`a`(追加)、`rb`(二进制读) 等模式。推荐使用 `with` 语句自动关闭。`os` 和 `pathlib` 模块处理路径。', example: '# 写入文件\nwith open("test.txt", "w", encoding="utf-8") as f:\n    f.write("Hello, Python!\\n")\n    f.write("第二行内容\\n")\n\n# 读取文件\nwith open("test.txt", "r", encoding="utf-8") as f:\n    lines = f.readlines()\n    for line in lines:\n        print(line.strip())\n\n# pathlib\nfrom pathlib import Path\np = Path("data") / "file.txt"\nprint(p.suffix)  # .txt' },
        { id: 'py-16', title: '正则表达式', language: 'python', content: '`re` 模块提供正则表达式支持。常用：`search()`、`match()`、`findall()`、`sub()`。', example: 'import re\nemail = re.search(r\'[\\w.]+@[\\w.]+\\.[a-z]+\', "a@b.com")\nprint(email.group())' },
      ],
    },
    {
      topic: '进阶开发',
      items: [
        { id: 'py-17', title: '异步编程 async/await', language: 'python', content: '`async def` 定义协程，`await` 挂起等待。`asyncio.run()` 启动事件循环。`asyncio.gather()` 并发执行。适用于 IO 密集型任务。', example: 'import asyncio\n\nasync def fetch(url):\n    print(f"获取 {url}...")\n    await asyncio.sleep(1)  # 模拟网络请求\n    return f"{url} 的数据"\n\nasync def main():\n    results = await asyncio.gather(\n        fetch("url1"),\n        fetch("url2"),\n        fetch("url3"),\n    )\n    print(results)\n\nasyncio.run(main())' },
        { id: 'py-18', title: '类型提示 Type Hints', language: 'python', content: 'Python 3.5+ 支持类型注解（不强制）。`typing` 模块提供 `List`、`Dict`、`Optional`、`Union` 等。`mypy` 工具做静态类型检查。', example: 'from typing import List, Optional, Dict\n\ndef greet(name: str, age: int = 0) -> str:\n    return f"{name} {age}"\n\ndef average(nums: List[float]) -> Optional[float]:\n    if not nums: return None\n    return sum(nums) / len(nums)\n\nscores: Dict[str, int] = {"小明": 95}' },
        { id: 'py-19', title: 'dataclass 数据类', language: 'python', content: 'Python 3.7+ `@dataclass` 自动生成 `__init__`、`__repr__`、`__eq__`。比普通类更简洁，支持默认值、不可变（`frozen=True`）。', example: 'from dataclasses import dataclass, field\n\n@dataclass\nclass Student:\n    name: str\n    age: int\n    scores: list = field(default_factory=list)\n    \n    @property\n    def average(self):\n        return sum(self.scores) / len(self.scores) if self.scores else 0\n\ns = Student("小明", 18, [90, 85, 95])\nprint(s)  # Student(name="小明", age=18, scores=[90, 85, 95])' },
        { id: 'py-20', title: '上下文管理器', language: 'python', content: '`with` 语句自动管理资源。自定义：实现 `__enter__`/`__exit__`，或用 `@contextmanager` 装饰器。常见：`open()`、`threading.Lock()`。', example: 'from contextlib import contextmanager\n\nclass File:\n    def __init__(self, name):\n        self.name = name\n    def __enter__(self):\n        self.f = open(self.name, "r")\n        return self.f\n    def __exit__(self, *args):\n        self.f.close()\n\nwith File("test.txt") as f:\n    print(f.read())' },
      ],
    },
  ],
  javascript: [
    {
      topic: '基础语法',
      items: [
        { id: 'js-1', title: '变量声明', language: 'javascript', content: '`let` 声明可变变量（块作用域），`const` 声明常量，`var` 是旧语法（函数作用域，已不推荐）。JS 是动态弱类型。', example: '// 推荐使用 let 和 const\nconst PI = 3.14159;     // 常量，不可重新赋值\nlet count = 0;           // 可变变量\ncount += 1;\n\n// 模板字符串\nconst name = "Alice";\nconst msg = `Hello, ${name}!`;\n\n// var 的问题：无块作用域\nif (true) {\n  var x = 10;  // 泄漏到外部\n}\nconsole.log(x);  // 10' },
        { id: 'js-2', title: '函数', language: 'javascript', content: '函数是一等公民。三种定义方式：函数声明、函数表达式、箭头函数。箭头函数 `=>` 简洁且自动绑定 `this`，但不适合作为对象方法。', example: '// 函数声明\nfunction add(a, b) {\n  return a + b;\n}\n\n// 箭头函数\nconst multiply = (a, b) => a * b;\nconst greet = name => `Hello, ${name}!`;\n\n// 默认参数\nfunction createUser(name, age = 18) {\n  return { name, age };\n}\n\n// 展开运算符\nconst nums = [1, 2, 3];\nconsole.log(Math.max(...nums));  // 3' },
        { id: 'js-3', title: '数组方法', language: 'javascript', content: '数组方法链式调用是 JS 的精髓：`map()`、`filter()`、`reduce()`、`find()`、`some()`、`every()`、`sort()`、`slice()`、`splice()`。', example: 'const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];\n\n// 链式操作\nconst result = numbers\n  .filter(n => n % 2 === 0)     // 偶数\n  .map(n => n * n)               // 平方\n  .reduce((sum, n) => sum + n, 0); // 求和\n\nconsole.log(result);  // 220\n\n// find: 查找第一个匹配\nconst found = numbers.find(n => n > 7);  // 8\n\n// every: 全部满足\nconst allPositive = numbers.every(n => n > 0);  // true' },
        { id: 'js-4', title: '对象与解构', language: 'javascript', content: '对象是键值对的集合。ES6 引入解构赋值，可从对象/数组中提取值。展开运算符 `...` 可合并对象。可选链 `?.` 防止读取 null 属性报错。', example: '// 对象简写\nconst name = "Alice", age = 20;\nconst user = { name, age };\n\n// 解构赋值\nconst { name: userName, age: userAge } = user;\nconst colors = ["red", "green", "blue"];\nconst [first, second] = colors;\n\n// 展开运算符\nconst defaults = { theme: "dark", lang: "zh" };\nconst config = { ...defaults, lang: "en" };\n\n// 可选链\nconst city = user?.address?.city ?? "未知";' },
      ],
    },
    {
      topic: '异步编程',
      items: [
        { id: 'js-5', title: 'Promise', language: 'javascript', content: 'Promise 表示异步操作的最终结果。三种状态：pending、fulfilled、rejected。用 `.then().catch()` 链式处理，`Promise.all()` 并行执行。', example: '// 创建 Promise\nfunction fetchData(id) {\n  return new Promise((resolve, reject) => {\n    setTimeout(() => {\n      if (id > 0) resolve({ id, data: "result" });\n      else reject(new Error("无效 ID"));\n    }, 1000);\n  });\n}\n\n// 链式调用\nfetchData(1)\n  .then(data => data.data)\n  .then(console.log)\n  .catch(console.error);\n\n// 并行执行\nPromise.all([fetchData(1), fetchData(2)])\n  .then(([r1, r2]) => console.log(r1, r2));' },
        { id: 'js-6', title: 'async/await', language: 'javascript', content: '`async/await` 是 Promise 的语法糖，让异步代码看起来像同步。`async` 函数返回 Promise，`await` 等待 Promise 完成。用 `try/catch` 处理错误。', example: '// async/await\nasync function getUser(id) {\n  try {\n    const response = await fetch(`/api/users/${id}`);\n    if (!response.ok) throw new Error("请求失败");\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error("获取用户失败:", error);\n    return null;\n  }\n}\n\n// IIFE 调用 async\n(async () => {\n  const user = await getUser(1);\n  console.log(user);\n})();' },
      ],
    },
    {
      topic: 'DOM 操作',
      items: [
        { id: 'js-7', title: 'DOM 查询与操作', language: 'javascript', content: '`querySelector`/`querySelectorAll` 用 CSS 选择器查找元素。`innerHTML`/`textContent` 修改内容，`classList` 管理类名，`style` 修改内联样式。', example: '// 查询元素\nconst btn = document.querySelector("#submit");\nconst items = document.querySelectorAll(".item");\n\n// 修改内容\nbtn.textContent = "提交中...";\n\n// 创建元素\nconst div = document.createElement("div");\ndiv.className = "card";\ndiv.innerHTML = "<h2>标题</h2><p>内容</p>";\ndocument.body.appendChild(div);\n\n// 类名操作\nbtn.classList.add("loading");\nbtn.classList.toggle("active");' },
        { id: 'js-8', title: '事件处理', language: 'javascript', content: '`addEventListener` 绑定事件。事件冒泡从内到外。`e.target` 触发元素，`e.preventDefault()` 阻止默认行为。事件委托利用冒泡优化性能。', example: 'btn.addEventListener("click", (e) => {\n  e.preventDefault();\n  console.log("点击了", e.target);\n});' },
      ],
    },
    {
      topic: '进阶特性',
      items: [
        { id: 'js-9', title: '闭包 Closure', language: 'javascript', content: '**闭包**：函数+其词法环境。内部函数可以访问外部函数的变量，即使外部函数已返回。用途：数据私有、模块化、柯里化。', example: 'function counter() {\n  let count = 0;\n  return function() {\n    count++;\n    return count;\n  };\n}\nconst c = counter();\nconsole.log(c()); // 1\nconsole.log(c()); // 2\nconsole.log(c()); // 3' },
        { id: 'js-10', title: '原型链与类', language: 'javascript', content: 'JS 基于原型继承。每个对象有 `__proto__` 指向其原型。ES6 `class` 是语法糖，本质仍是原型。`extends`、`super` 简化继承。', example: 'class Animal {\n  constructor(name) {\n    this.name = name;\n  }\n  speak() {\n    return `${this.name} makes a sound`;\n  }\n}\n\nclass Dog extends Animal {\n  speak() {\n    return `${this.name}: 汪汪!`;\n  }\n}\n\nconst d = new Dog("旺财");\nconsole.log(d.speak()); // 旺财: 汪汪!' },
        { id: 'js-11', title: '模块化 ES Modules', language: 'javascript', content: '`export` 导出，`import` 导入。支持默认导出和命名导出。动态 `import()` 返回 Promise，支持按需加载（代码分割）。', example: '// math.js\nexport function add(a, b) { return a + b; }\nexport const PI = 3.14159;\nexport default function greet(n) { return `Hi ${n}`; }\n\n// main.js\nimport greet, { add, PI } from "./math.js";\nconsole.log(greet("Alice"));  // Hi Alice\nconsole.log(add(1, 2));       // 3\n\n// 动态导入\nconst module = await import("./math.js");' },
        { id: 'js-12', title: 'Set 与 Map', language: 'javascript', content: '`Set` 存储唯一值，`Map` 键值对（键可以是任意类型）。比数组/对象更适合查重和任意键映射场景。', example: '// Set 去重\nconst nums = [1, 2, 2, 3, 3, 3];\nconst unique = [...new Set(nums)];  // [1, 2, 3]\n\n// Map 任意键\nconst map = new Map();\nmap.set({id: 1}, "data");\nmap.set("key", "value");\n\nfor (const [k, v] of map) {\n  console.log(k, v);\n}' },
      ],
    },
  ],
  java: [
    {
      topic: '基础语法',
      items: [
        { id: 'jv-1', title: 'Hello World 与基本结构', language: 'java', content: 'Java 程序必须包含在类中。`main` 方法是程序入口。`System.out.println()` 输出。Java 文件名必须与 public 类名相同。', example: 'public class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
        { id: 'jv-2', title: '变量与数据类型', language: 'java', content: 'Java 是静态强类型语言。8 种基本类型：`byte`、`short`、`int`、`long`、`float`、`double`、`boolean`、`char`。引用类型：`String`、数组、类实例。', example: 'int age = 20;\ndouble price = 19.99;\nboolean isStudent = true;\nchar grade = \'A\';\nString name = "张三";\n\n// 类型转换\nint num = (int) 3.14;    // 强制转换\nString str = String.valueOf(100);  // int → String\nint parsed = Integer.parseInt("42"); // String → int\n\nfinal double PI = 3.14159;  // 常量' },
        { id: 'jv-3', title: '控制流程', language: 'java', content: '`if-else`、`switch`、`for`、`while`、`do-while`。增强 for 循环（for-each）遍历数组和 Collection。`break`、`continue` 控制循环。', example: '// if-else\nint score = 85;\nString grade;\nif (score >= 90) grade = "A";\nelse if (score >= 80) grade = "B";\nelse grade = "C";\n\n// switch（Java 14+ 可用 -> 语法）\nswitch (grade) {\n    case "A" -> System.out.println("优秀");\n    case "B" -> System.out.println("良好");\n    default -> System.out.println("继续努力");\n}\n\n// for-each\nint[] nums = {1, 2, 3, 4, 5};\nfor (int n : nums) System.out.print(n + " ");' },
        { id: 'jv-4', title: '数组与集合', language: 'java', content: '数组是固定长度的同类型数据容器。`java.util` 包提供 `ArrayList`（动态数组）、`HashMap`（键值对）、`HashSet`（不重复集合）等。泛型保证类型安全。', example: 'import java.util.*;\n\n// 数组\nint[] numbers = new int[5];\nint[] init = {1, 2, 3, 4, 5};\nSystem.out.println(init.length);  // 5\n\n// ArrayList（动态数组）\nList<String> names = new ArrayList<>();\nnames.add("Alice");\nnames.add("Bob");\nnames.remove(0);\n\n// HashMap（键值对）\nMap<String, Integer> scores = new HashMap<>();\nscores.put("小明", 95);\nscores.put("小红", 88);\n\n// 遍历 Map\nfor (var entry : scores.entrySet()) {\n    System.out.println(entry.getKey() + ": " + entry.getValue());\n}' },
      ],
    },
    {
      topic: '面向对象',
      items: [
        { id: 'jv-5', title: '类、继承与多态', language: 'java', content: '`extends` 继承父类，`implements` 实现接口。`@Override` 重写方法。`super` 调用父类，`this` 指当前实例。`abstract` 抽象类，`final` 禁止继承/重写。', example: '// 抽象类\nabstract class Animal {\n    protected String name;\n    public Animal(String name) { this.name = name; }\n    public abstract String speak();\n}\n\n// 继承\nclass Dog extends Animal {\n    public Dog(String name) { super(name); }\n    @Override\n    public String speak() { return name + ": 汪汪!"; }\n}\n\n// 接口\ninterface Flyable {\n    void fly();\n}\n\nclass Bird extends Animal implements Flyable {\n    public Bird(String name) { super(name); }\n    @Override public String speak() { return name + ": 叽叽!"; }\n    @Override public void fly() { System.out.println(name + " 在飞"); }\n}' },
        { id: 'jv-6', title: '泛型详解', language: 'java', content: '泛型提供编译时类型安全。`<T>` 类型参数。通配符：`<?>` 任意类型，`<? extends T>` 上限（生产者），`<? super T>` 下限（消费者）。PECS 原则。', example: '// 泛型类\nclass Box<T> {\n    private T content;\n    public void set(T c) { this.content = c; }\n    public T get() { return content; }\n}\n\n// 泛型方法\npublic static <T> void printArray(T[] arr) {\n    for (T item : arr) System.out.print(item + " ");\n}\n\n// 通配符\n// List<? extends Number> 可以读 Number，不能写\n// List<? super Integer> 可以写 Integer，读出来是 Object\n\n// PECS: Producer Extends, Consumer Super' },
        { id: 'jv-7', title: '异常处理', language: 'java', content: '受检异常（checked）必须 try-catch 或 throws 声明。非受检异常（RuntimeException）可选。`try-with-resources` 自动关闭资源（实现 AutoCloseable）。', example: 'import java.io.*;\n\npublic static void readFile(String path) {\n    // try-with-resources 自动关闭\n    try (BufferedReader reader = new BufferedReader(new FileReader(path))) {\n        String line;\n        while ((line = reader.readLine()) != null) {\n            System.out.println(line);\n        }\n    } catch (FileNotFoundException e) {\n        System.err.println("文件未找到: " + path);\n    } catch (IOException e) {\n        System.err.println("读取错误: " + e.getMessage());\n    }\n}' },
      ],
    },
    {
      topic: '集合框架',
      items: [
        { id: 'jv-8', title: 'List/Set/Map', language: 'java', content: '`ArrayList` 随机访问快 O(1)，`LinkedList` 插入删除快。`HashSet` 无序去重，`TreeSet` 排序去重。`HashMap` 键值对 O(1)，`TreeMap` 按键排序。', example: 'import java.util.*;\n\n// ArrayList vs LinkedList\nList<Integer> list = new ArrayList<>(); // 读快\nList<Integer> linked = new LinkedList<>(); // 插入快\n\n// Set：去重\nSet<String> names = new HashSet<>();\nnames.add("Alice");\nnames.add("Bob");\nnames.add("Alice"); // 忽略重复\n\n// TreeSet 自动排序\nSet<Integer> sorted = new TreeSet<>(List.of(5, 2, 8, 1));\nSystem.out.println(sorted); // [1, 2, 5, 8]\n\n// TreeMap 键排序\nMap<String, Integer> map = new TreeMap<>();\nmap.put("C", 3); map.put("A", 1); map.put("B", 2);' },
        { id: 'jv-9', title: 'Stream API', language: 'java', content: 'Java 8+ Stream 提供函数式数据处理：`filter`、`map`、`sorted`、`collect`。惰性求值，`Collectors` 提供常用收集器。', example: 'List<String> names = List.of("Alice", "Bob", "Charlie");\nList<String> result = names.stream()\n    .filter(n -> n.length() > 3)\n    .map(String::toUpperCase)\n    .collect(Collectors.toList());' },
      ],
    },
    {
      topic: '进阶特性',
      items: [
        { id: 'jv-10', title: '并发与线程池', language: 'java', content: '`ExecutorService` 管理线程池。`Executors.newFixedThreadPool(n)` 创建固定大小池。`Future` 获取异步结果。`CompletableFuture` 支持链式异步操作。', example: 'import java.util.concurrent.*;\n\nExecutorService pool = Executors.newFixedThreadPool(3);\nFuture<Integer> future = pool.submit(() -> {\n    Thread.sleep(1000);\n    return 42;\n});\nSystem.out.println(future.get());  // 阻塞等待结果\npool.shutdown();' },
        { id: 'jv-11', title: 'Optional 与空值处理', language: 'java', content: '`Optional<T>` 容器避免 NullPointerException。`ofNullable()`、`ifPresent()`、`orElse()`、`map()` 链式安全处理可能为空的值。', example: 'import java.util.Optional;\n\nOptional<String> name = Optional.ofNullable(getName());\nString display = name\n    .filter(n -> n.length() > 0)\n    .map(String::toUpperCase)\n    .orElse("未知");\n\nname.ifPresent(System.out::println);' },
        { id: 'jv-12', title: '枚举 Enum', language: 'java', content: 'Java 枚举是特殊的类，可以有构造器、方法、字段。适合表示固定集合的常量。`values()` 遍历所有值，`switch` 可直接使用。', example: 'enum Day {\n    MON("周一"), TUE("周二"), WED("周三");\n    private String cn;\n    Day(String cn) { this.cn = cn; }\n    public String getCn() { return cn; }\n}\n\nDay today = Day.MON;\nSystem.out.println(today.getCn());  // 周一' },
      ],
    },
  ],
  cpp: [
    {
      topic: '基础语法',
      items: [
        { id: 'cp-1', title: 'Hello World 与 I/O', language: 'cpp', content: '`#include <iostream>` 引入输入输出流。`std::cout` 输出，`std::cin` 输入。`<<` 流插入运算符，`>>` 流提取运算符。`std::endl` 换行并刷新缓冲。', example: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    \n    string name;\n    int age;\n    cout << "输入名字和年龄: ";\n    cin >> name >> age;\n    cout << name << " 今年 " << age << " 岁" << endl;\n    \n    return 0;\n}' },
        { id: 'cp-2', title: '指针与引用', language: 'cpp', content: '指针 `*` 存地址，`&` 取地址，`->` 通过指针访问成员。引用 `&` 是别名，声明时必须初始化且不可更改。`nullptr` 表示空指针（C++11）。', example: 'int a = 10;\nint* p = &a;     // p 指向 a 的地址\nint& r = a;      // r 是 a 的引用（别名）\n\n*p = 20;         // 通过指针修改\nr = 30;          // 通过引用修改\ncout << a;       // 30\n\n// 指针与动态内存\nint* arr = new int[5];\narr[0] = 1;\ndelete[] arr;    // 释放内存\narr = nullptr;   // 防止悬空指针' },
        { id: 'cp-3', title: 'STL 容器概览', language: 'cpp', content: 'STL 容器分三类：序列容器（`vector`、`deque`、`list`）、关联容器（`set`、`map`、`multiset`）、无序容器（`unordered_set`、`unordered_map`，C++11）。', example: '#include <vector>\n#include <map>\n#include <set>\n#include <algorithm>\n\nvector<int> nums = {3, 1, 4, 1, 5};\nnums.push_back(9);\nsort(nums.begin(), nums.end());\n\nmap<string, int> scores;\nscores["小明"] = 95;\nscores["小红"] = 88;\n\nset<int> unique_nums(nums.begin(), nums.end());\n\n// C++11 range-based for\nfor (int n : nums) cout << n << " ";' },
      ],
    },
    {
      topic: '面向对象',
      items: [
        { id: 'cp-4', title: '类与封装', language: 'cpp', content: '`class` 默认 private，`struct` 默认 public。成员函数可定义在类内或类外（`::` 作用域解析）。构造函数、析构函数、拷贝构造是特殊成员函数。', example: 'class Student {\nprivate:\n    string name;\n    int age;\n    double score;\n\npublic:\n    // 构造函数\n    Student(string n, int a) : name(n), age(a), score(0) {}\n    \n    // 析构函数\n    ~Student() {}\n    \n    // 成员函数\n    void setScore(double s) { score = s; }\n    void print() const {\n        cout << name << " " << age << " " << score << endl;\n    }\n};\n\nStudent s("小明", 18);\ns.setScore(95.5);\ns.print();' },
        { id: 'cp-5', title: '继承与虚函数', language: 'cpp', content: '`virtual` 关键字声明虚函数，运行时多态通过基类指针/引用调用派生类方法。纯虚函数 `= 0` 定义抽象类。`override` 和 `final` 关键字（C++11）。', example: 'class Shape {\npublic:\n    virtual double area() const = 0;  // 纯虚函数\n    virtual ~Shape() {}               // 虚析构函数\n};\n\nclass Circle : public Shape {\n    double radius;\npublic:\n    Circle(double r) : radius(r) {}\n    double area() const override { return 3.14159 * radius * radius; }\n};\n\nclass Rectangle : public Shape {\n    double w, h;\npublic:\n    Rectangle(double w, double h) : w(w), h(h) {}\n    double area() const override { return w * h; }\n};' },
      ],
    },
    {
      topic: '内存管理',
      items: [
        { id: 'cp-6', title: 'new / delete', language: 'cpp', content: '`new` 在堆上分配内存，返回指针。`delete` 释放单个对象，`delete[]` 释放数组。必须配对使用，否则内存泄漏。现代 C++ 推荐用智能指针代替。', example: '// 单个对象\nint* p = new int(42);\ncout << *p << endl;\ndelete p;\np = nullptr;\n\n// 对象数组\nStudent* students = new Student[10];\ndelete[] students;\n\n// new 的 nothrow 版本（失败返回 nullptr）\nint* big = new (nothrow) int[1000000000];\nif (!big) {\n    cout << "内存分配失败" << endl;\n}' },
        { id: 'cp-7', title: '智能指针', language: 'cpp', content: '`unique_ptr` 独占所有权（不可拷贝，可移动）。`shared_ptr` 共享所有权（引用计数）。`weak_ptr` 不增加计数，用于打破循环引用。`make_unique`/`make_shared` 推荐使用。', example: '#include <memory>\n\n// unique_ptr：独占所有权\nauto p1 = make_unique<int>(42);\nauto p2 = move(p1);  // p1 变为 nullptr\n\n// shared_ptr：引用计数\nauto sp1 = make_shared<string>("hello");\n{\n    auto sp2 = sp1;         // 引用计数 = 2\n    cout << *sp2 << endl;\n}  // sp2 析构，引用计数 = 1\n\n// weak_ptr：不增加引用计数\nweak_ptr<int> wp;\n{\n    auto sp = make_shared<int>(100);\n    wp = sp;\n    if (auto locked = wp.lock()) {  // 尝试获取 shared_ptr\n        cout << *locked << endl;\n    }\n}  // sp 析构，wp 失效' },
      ],
    },
    {
      topic: '现代C++特性',
      items: [
        { id: 'cp-8', title: 'auto 与 lambda', language: 'cpp', content: '`auto` 自动类型推导（C++11）。lambda 表达式 `[capture](params) -> ret { body }` 创建匿名函数对象。`[]` 捕获列表：`=` 值捕获，`&` 引用捕获。', example: '#include <algorithm>\n#include <vector>\n\n// auto 类型推导\nauto x = 42;          // int\nauto y = 3.14;        // double\nauto z = "hello"s;    // std::string (C++14)\n\n// lambda 表达式\nvector<int> nums = {5, 2, 8, 1, 9};\n\n// 排序 lambda\nsort(nums.begin(), nums.end(),\n     [](int a, int b) { return a > b; });\n\n// 闭包捕获\nint threshold = 5;\nauto count = count_if(nums.begin(), nums.end(),\n                      [threshold](int n) { return n > threshold; });' },
        { id: 'cp-9', title: '移动语义', language: 'cpp', content: '移动语义（C++11）避免不必要的深拷贝。`std::move` 将左值转为右值引用。`&&` 是右值引用。', example: 'vector<int> v1 = {1, 2, 3, 4, 5};\nvector<int> v2 = move(v1);  // 移动而非拷贝\ncout << v2.size();  // 5' },
      ],
    },
    {
      topic: '进阶特性',
      items: [
        { id: 'cp-10', title: 'RAII 与资源管理', language: 'cpp', content: '**RAII**：资源获取即初始化。构造函数获取资源，析构函数释放。智能指针、文件流、互斥锁都基于 RAII。避免手动 new/delete。', example: 'class File {\n    FILE* fp;\npublic:\n    File(const char* name) : fp(fopen(name, "r")) {}\n    ~File() { if (fp) fclose(fp); }\n    File(const File&) = delete;  // 禁止拷贝\n    File(File&& other) : fp(other.fp) { other.fp = nullptr; }\n    operator FILE*() { return fp; }\n};' },
        { id: 'cp-11', title: '模板进阶', language: 'cpp', content: '**变参模板**（`template<typename... Args>`）：参数数量可变。**模板元编程**：编译期计算。`constexpr` 函数在编译期求值。', example: '// 变参模板\ntemplate<typename T>\nT sum(T t) { return t; }\n\ntemplate<typename T, typename... Args>\nT sum(T first, Args... rest) {\n    return first + sum(rest...);\n}\n// 用法: sum(1, 2, 3, 4) → 10\n\n// constexpr 编译期计算\nconstexpr int factorial(int n) {\n    return n <= 1 ? 1 : n * factorial(n - 1);\n}\nint arr[factorial(5)];  // 编译期确定大小' },
      ],
    },
  ],
  c: [
    {
      topic: '基础语法',
      items: [
        { id: 'c-1', title: 'Hello World 与基本结构', language: 'c', content: '`#include <stdio.h>` 引入标准 I/O。`main` 函数是入口。`printf` 格式化输出，`scanf` 格式化输入。C 是过程式语言，没有类和对象。', example: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    \n    int age;\n    printf("输入年龄: ");\n    scanf("%d", &age);\n    printf("你 %d 岁了\\n", age);\n    \n    return 0;\n}' },
        { id: 'c-2', title: '数据类型与格式化', language: 'c', content: '基本类型：`int`、`long`、`float`、`double`、`char`。`printf` 格式化：`%d` 整数、`%f` 浮点、`%c` 字符、`%s` 字符串、`%p` 指针、`%x` 十六进制。', example: '#include <stdio.h>\n\nint main() {\n    int age = 20;\n    float height = 175.5f;\n    double pi = 3.1415926535;\n    char grade = \'A\';\n    char name[] = "张三";\n    \n    printf("姓名: %s\\n", name);\n    printf("年龄: %d, 身高: %.1f\\n", age, height);\n    printf("圆周率: %.10f\\n", pi);\n    printf("等级: %c\\n", grade);\n    \n    return 0;\n}' },
        { id: 'c-3', title: '指针深入', language: 'c', content: '指针是 C 语言的核心。`&` 取地址，`*` 解引用。指针算术：`ptr + 1` 移动 sizeof(type) 字节。`void*` 通用指针。函数指针用于回调。', example: '#include <stdio.h>\n\nvoid swap(int* a, int* b) {\n    int temp = *a;\n    *a = *b;\n    *b = temp;\n}\n\nint main() {\n    int x = 10, y = 20;\n    swap(&x, &y);  // 传地址实现交换\n    printf("x=%d, y=%d\\n", x, y);\n    \n    // 指针算术\n    int arr[] = {10, 20, 30, 40, 50};\n    int* p = arr;  // 指向数组首元素\n    printf("%d\\n", *(p + 2));  // 30\n    \n    return 0;\n}' },
        { id: 'c-4', title: '动态内存分配', language: 'c', content: '`malloc` 分配堆内存（返回 `void*`），`calloc` 分配并清零，`realloc` 重新分配。`free` 释放内存。务必检查返回值是否为 NULL。', example: '#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n = 5;\n    \n    // malloc 分配\n    int* arr = (int*)malloc(n * sizeof(int));\n    if (!arr) {\n        printf("内存分配失败\\n");\n        return 1;\n    }\n    \n    for (int i = 0; i < n; i++) arr[i] = i * 10;\n    for (int i = 0; i < n; i++) printf("%d ", arr[i]);\n    \n    free(arr);  // 释放内存\n    arr = NULL;   // 防止悬空指针\n    \n    return 0;\n}' },
      ],
    },
    {
      topic: '高级主题',
      items: [
        { id: 'c-5', title: '结构体与联合体', language: 'c', content: '`struct` 将多个变量组合成一个类型。`.` 访问成员，`->` 通过指针访问。`typedef` 定义类型别名。`union` 所有成员共享同一内存空间。', example: '#include <stdio.h>\n\ntypedef struct {\n    char name[50];\n    int age;\n    double score;\n} Student;\n\nvoid printStudent(Student* s) {\n    printf("%s, %d 岁, %.1f 分\\n", s->name, s->age, s->score);\n}\n\nint main() {\n    Student s1 = {"小明", 18, 95.5};\n    printStudent(&s1);\n    \n    // union 所有成员共享内存\n    union Data {\n        int i;\n        float f;\n        char str[20];\n    };\n    return 0;\n}' },
        { id: 'c-6', title: '文件操作', language: 'c', content: '`fopen` 打开文件（模式：`r`读、`w`写、`a`追加、`rb`/`wb` 二进制）。`fprintf`/`fscanf` 格式化读写，`fread`/`fwrite` 二进制读写。`fclose` 关闭。', example: 'FILE* fp = fopen("test.txt", "w");\nif (!fp) { perror("打开失败"); return 1; }\nfprintf(fp, "Hello!\\n");\nfclose(fp);' },
      ],
    },
    {
      topic: '高级特性',
      items: [
        { id: 'c-7', title: '位运算', language: 'c', content: '`&` 与、`|` 或、`^` 异或、`~` 取反、`<<` 左移、`>>` 右移。常见用途：标志位、乘除2的幂、RGB颜色操作。', example: '#include <stdio.h>\n\nint main() {\n    int flags = 0;\n    flags |= (1 << 3);   // 设置第3位\n    flags &= ~(1 << 3);  // 清除第3位\n    if (flags & (1 << 3)) printf("set\\n");\n    \n    int swapped = ((x & 0xFF) << 8) | ((x >> 8) & 0xFF);\n    return 0;\n}' },
        { id: 'c-8', title: '函数指针与回调', language: 'c', content: '函数名即地址，可赋值给函数指针。`typedef` 简化声明。用于回调、qsort 比较器、策略模式。', example: '#include <stdio.h>\n\ntypedef int (*Operation)(int, int);\n\nint add(int a, int b) { return a + b; }\nint multiply(int a, int b) { return a * b; }\n\nvoid calc(Operation op, int x, int y) {\n    printf("结果: %d\\n", op(x, y));\n}\n\nint main() {\n    calc(add, 3, 4);       // 7\n    calc(multiply, 3, 4);  // 12\n    return 0;\n}' },
      ],
    },
  ],
  csharp: [
    {
      topic: '基础语法',
      items: [
        { id: 'cs-1', title: 'Hello World 与基本结构', language: 'csharp', content: 'C# 程序入口是 `Main` 方法。`Console.WriteLine` 输出，`Console.ReadLine` 输入。`using` 引入命名空间。C# 是类型安全的面向对象语言。', example: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n        \n        Console.Write("输入名字: ");\n        string name = Console.ReadLine();\n        Console.WriteLine($"你好，{name}!");\n    }\n}' },
        { id: 'cs-2', title: '数据类型', language: 'csharp', content: '值类型：`int`、`long`、`float`、`double`、`decimal`、`bool`、`char`、`struct`、`enum`。引用类型：`string`、`class`、`array`、`interface`。`var` 隐式类型推断。', example: 'int age = 20;\ndouble price = 19.99;\ndecimal money = 100.50m;  // 高精度金融计算\nbool isStudent = true;\nstring name = "张三";\n\nvar x = 42;      // 编译器推断为 int\nvar s = "hello"; // 编译器推断为 string\n\n// 可空类型\nint? maybeNull = null;\nint value = maybeNull ?? 0;  // null 合并' },
        { id: 'cs-3', title: 'LINQ 查询', language: 'csharp', content: 'LINQ（Language Integrated Query）是 C# 的查询语法，可对集合、数据库、XML 等进行统一查询。方法语法和查询语法两种风格。', example: 'using System;\nusing System.Linq;\nusing System.Collections.Generic;\n\nvar numbers = new List<int> { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };\n\n// 方法语法\nvar evens = numbers.Where(n => n % 2 == 0)\n                   .Select(n => n * n)\n                   .OrderByDescending(n => n);\n\n// 查询语法\nvar result = from n in numbers\n             where n > 5\n             orderby n descending\n             select new { Number = n, Square = n * n };\n\nforeach (var item in result)\n    Console.WriteLine($"{item.Number} -> {item.Square}");' },
      ],
    },
    {
      topic: '面向对象',
      items: [
        { id: 'cs-4', title: '类与属性', language: 'csharp', content: 'C# 属性（Property）封装字段，支持 `get`/`set` 访问器。自动属性简写 `{ get; set; }`。`readonly` 只读字段，`const` 编译时常量。', example: 'class Student {\n    // 自动属性\n    public string Name { get; set; }\n    public int Age { get; private set; }\n    \n    // 完整属性\n    private double score;\n    public double Score {\n        get => score;\n        set {\n            if (value < 0 || value > 100)\n                throw new ArgumentException("分数范围 0-100");\n            score = value;\n        }\n    }\n    \n    public Student(string name, int age) {\n        Name = name;\n        Age = age;\n    }\n}' },
        { id: 'cs-5', title: '继承与接口', language: 'csharp', content: 'C# 只支持单继承，可多实现接口。`virtual` 虚方法，`override` 重写，`abstract` 抽象类/方法，`sealed` 禁止继承/重写。`base` 调用父类。', example: 'abstract class Animal {\n    public string Name { get; set; }\n    public abstract string Speak();\n}\n\ninterface IFlyable {\n    void Fly();\n}\n\nclass Bird : Animal, IFlyable {\n    public Bird(string name) { Name = name; }\n    public override string Speak() => $\"{Name}: 叽叽!\";\n    public void Fly() => Console.WriteLine($\"{Name} 在飞\");\n}\n\nclass Program {\n    static void Main() {\n        Bird b = new Bird("小黄");\n        Console.WriteLine(b.Speak());\n        b.Fly();\n    }\n}' },
      ],
    },
    {
      topic: '异步编程',
      items: [
        { id: 'cs-6', title: 'async / await', language: 'csharp', content: 'C# 的 `async/await` 是异步编程的核心。`Task` 表示异步操作，`Task<T>` 返回结果。异步方法命名约定以 Async 结尾。`ConfigureAwait(false)` 避免死锁。', example: 'using System;\nusing System.Net.Http;\nusing System.Threading.Tasks;\n\nclass Program {\n    static async Task Main() {\n        string content = await FetchUrlAsync("https://example.com");\n        Console.WriteLine(content.Length);\n    }\n    \n    static async Task<string> FetchUrlAsync(string url) {\n        using var client = new HttpClient();\n        try {\n            string result = await client.GetStringAsync(url);\n            return result;\n        } catch (HttpRequestException e) {\n            Console.WriteLine($\"请求失败: {e.Message}\");\n            return "";\n        }\n    }\n}' },
      ],
    },
  ],
  go: [
    {
      topic: '基础语法',
      items: [
        { id: 'go-1', title: 'Hello World 与包', language: 'go', content: 'Go 程序由 `package` 组成，`main` 包是入口。`import` 引入依赖，支持分组导入。`func main()` 是启动函数，无参数无返回值。', example: 'package main\n\nimport (\n    "fmt"\n)\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}' },
        { id: 'go-2', title: '变量与类型系统', language: 'go', content: '`var` 显式声明，`:=` 短声明（仅函数内）。Go 是静态强类型，不支持隐式转换。零值机制：int=0, string="", bool=false, pointer=nil。', example: 'package main\n\nimport "fmt"\n\nfunc main() {\n    var name string = "Go"\n    age := 15           // 类型推断\n    pi := 3.14159\n    \n    const Version = "1.21"\n    \n    // 多变量声明\n    var x, y int = 10, 20\n    a, b := "hello", true\n    \n    fmt.Printf("%s %d %f %d\\n", name, age, pi, x+y)\n    fmt.Println(a, b)\n}' },
        { id: 'go-3', title: '控制流程', language: 'go', content: 'Go 只有 `for` 一种循环（可模拟 while）。`if` 可带简短语句。`switch` 默认不穿透（无需 break）。`defer` 延迟执行。', example: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // for 循环的三种形式\n    for i := 0; i < 3; i++ {  // 经典 for\n        fmt.Println(i)\n    }\n    \n    // 类似 while\n    n := 3\n    for n > 0 {\n        fmt.Println(n)\n        n--\n    }\n    \n    // if 带简短语句\n    if num := 9; num < 0 {\n        fmt.Println("负数")\n    } else if num < 10 {\n        fmt.Println("一位数")\n    } else {\n        fmt.Println("多位数")\n    }\n    \n    // switch\n    switch day := "一"; day {\n    case "一":\n        fmt.Println("周一")\n    default:\n        fmt.Println("其他")\n    }\n}' },
        { id: 'go-4', title: '函数与多返回值', language: 'go', content: 'Go 函数支持多返回值，常用于 `(result, error)` 模式。命名返回值可简化 return。函数是一等公民，可赋值给变量。', example: 'package main\n\nimport (\n    "fmt"\n    "errors"\n)\n\nfunc divide(a, b float64) (float64, error) {\n    if b == 0 {\n        return 0, errors.New("除数不能为零")\n    }\n    return a / b, nil\n}\n\nfunc main() {\n    if result, err := divide(10, 3); err != nil {\n        fmt.Println("错误:", err)\n    } else {\n        fmt.Printf("结果: %.2f\\n", result)\n    }\n    \n    // 匿名函数\n    square := func(x int) int { return x * x }\n    fmt.Println(square(5))  // 25\n}' },
        { id: 'go-5', title: '复合数据类型', language: 'go', content: '`array` 固定长度，`slice` 动态切片（最常用）。`map` 键值对。`struct` 定义结构体。`make()` 创建 slice/map/chan，`new()` 分配零值指针。', example: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // slice（动态数组）\n    nums := []int{3, 1, 4, 1, 5}\n    nums = append(nums, 9)\n    fmt.Println(nums[1:4])  // [1 4 1]\n    \n    // map\n    scores := map[string]int{\n        "小明": 95,\n        "小红": 88,\n    }\n    scores["小刚"] = 72\n    delete(scores, "小刚")\n    \n    if score, ok := scores["小明"]; ok {\n        fmt.Println("小明:", score)\n    }\n    \n    // struct\n    type Person struct {\n        Name string\n        Age  int\n    }\n    p := Person{Name: "张三", Age: 20}\n    fmt.Printf("%+v\\n", p)\n}' },
      ],
    },
    {
      topic: '并发编程',
      items: [
        { id: 'go-6', title: 'Goroutine', language: 'go', content: '`go` 关键字启动轻量级并发单元。Goroutine 比 OS 线程轻100倍，可运行百万级。使用 `sync.WaitGroup` 等待一组 goroutine 完成。', example: 'package main\n\nimport (\n    "fmt"\n    "sync"\n    "time"\n)\n\nfunc worker(id int, wg *sync.WaitGroup) {\n    defer wg.Done()  // 计数器减1\n    fmt.Printf("Worker %d 开始\\n", id)\n    time.Sleep(time.Second)\n    fmt.Printf("Worker %d 结束\\n", id)\n}\n\nfunc main() {\n    var wg sync.WaitGroup\n    for i := 1; i <= 3; i++ {\n        wg.Add(1)\n        go worker(i, &wg)\n    }\n    wg.Wait()  // 等待所有 worker 完成\n    fmt.Println("全部完成")\n}' },
        { id: 'go-7', title: 'Channel 通道', language: 'go', content: 'Channel 是 goroutine 间的通信管道。`make(chan T)` 创建无缓冲 channel（同步），`make(chan T, n)` 创建缓冲 channel。`select` 多路复用。', example: 'package main\n\nimport "fmt"\n\nfunc producer(ch chan<- int) {\n    for i := 1; i <= 5; i++ {\n        ch <- i  // 发送\n        fmt.Println("生产:", i)\n    }\n    close(ch)  // 关闭通道\n}\n\nfunc main() {\n    ch := make(chan int, 2)  // 缓冲通道\n    go producer(ch)\n    \n    // range 接收直到通道关闭\n    for num := range ch {\n        fmt.Println("消费:", num)\n    }\n    \n    // select 多路复用\n    ch1, ch2 := make(chan string), make(chan string)\n    select {\n    case msg := <-ch1:\n        fmt.Println("ch1:", msg)\n    case msg := <-ch2:\n        fmt.Println("ch2:", msg)\n    default:\n        fmt.Println("无数据")\n    }\n}' },
        { id: 'go-8', title: '接口 interface', language: 'go', content: 'Go 接口是隐式实现（无需 `implements` 关键字）。只要类型实现了接口的所有方法，就自动实现了该接口。空接口 `interface{}`（或 `any`）可接受任何类型。', example: 'package main\n\nimport "fmt"\n\ntype Speaker interface {\n    Speak() string\n}\n\ntype Dog struct{ Name string }\nfunc (d Dog) Speak() string { return d.Name + ": 汪汪!" }\n\ntype Cat struct{ Name string }\nfunc (c Cat) Speak() string { return c.Name + ": 喵喵!" }\n\nfunc Greet(s Speaker) {\n    fmt.Println(s.Speak())\n}\n\nfunc main() {\n    dog := Dog{"旺财"}\n    cat := Cat{"咪咪"}\n    Greet(dog)  // 隐式实现了 Speaker 接口\n    Greet(cat)\n    \n    // 类型断言\n    var s Speaker = dog\n    if d, ok := s.(Dog); ok {\n        fmt.Println("它是狗:", d.Name)\n    }\n}' },
      ],
    },
    {
      topic: '错误处理',
      items: [
        { id: 'go-9', title: 'error 与 panic', language: 'go', content: 'Go 不使用异常，通过返回 `error` 值处理错误。`if err != nil` 是标志性写法。`panic` 仅不可恢复时使用，`recover` 在 defer 中捕获。', example: 'func readFile(path string) error {\n    f, err := os.Open(path)\n    if err != nil { return err }\n    defer f.Close()\n    return nil\n}' },
      ],
    },
    {
      topic: '进阶并发',
      items: [
        { id: 'go-10', title: 'select 多路复用', language: 'go', content: '`select` 同时监听多个 channel 操作，哪个先就绪就执行哪个。`default` 分支防止阻塞。常用于超时控制、非阻塞收发。', example: 'select {\ncase msg := <-ch1:\n    fmt.Println("ch1:", msg)\ncase msg := <-ch2:\n    fmt.Println("ch2:", msg)\ncase <-time.After(1 * time.Second):\n    fmt.Println("超时")\ndefault:\n    fmt.Println("无数据")\n}' },
        { id: 'go-11', title: 'sync.Mutex 互斥锁', language: 'go', content: '`sync.Mutex` 保护共享数据。`Lock()` 加锁，`defer Unlock()` 确保释放。`sync.RWMutex` 支持读共享写独占。', example: 'type Counter struct {\n    mu sync.Mutex\n    val int\n}\nfunc (c *Counter) Inc() {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    c.val++\n}' },
        { id: 'go-12', title: 'Context 上下文', language: 'go', content: '`context.Context` 传递请求范围的值、取消信号、超时。`WithCancel`、`WithTimeout`、`WithDeadline`。HTTP 请求中常用 `r.Context()`。', example: 'ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)\ndefer cancel()\n\nselect {\ncase <-doWork(ctx):\n    fmt.Println("完成")\ncase <-ctx.Done():\n    fmt.Println("超时:", ctx.Err())\n}' },
      ],
    },
  ],
  algo: [
    {
      topic: '排序算法',
      items: [
        { id: 'al-1', title: '冒泡排序', language: 'algo', content: '**思想**：重复遍历数组，比较相邻元素，将较大的元素"冒泡"到右侧。**时间复杂度**：O(n²)，**空间**：O(1)。**稳定**排序。', example: 'def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n - 1):\n        swapped = False\n        for j in range(n - 1 - i):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n                swapped = True\n        if not swapped:\n            break\n    return arr' },
        { id: 'al-2', title: '选择排序', language: 'algo', content: '**思想**：每次从未排序部分选出最小元素，放到已排序部分末尾。**时间复杂度**：O(n²)，**空间**：O(1)。**不稳定**排序。', example: 'def selection_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        min_idx = i\n        for j in range(i + 1, n):\n            if arr[j] < arr[min_idx]:\n                min_idx = j\n        arr[i], arr[min_idx] = arr[min_idx], arr[i]\n    return arr' },
        { id: 'al-3', title: '插入排序', language: 'algo', content: '**思想**：将未排序元素逐个插入到已排序部分的正确位置，类似理牌。**时间复杂度**：O(n²)，近乎有序时 O(n)。**空间**：O(1)。**稳定**排序。', example: 'def insertion_sort(arr):\n    for i in range(1, len(arr)):\n        key = arr[i]\n        j = i - 1\n        while j >= 0 and arr[j] > key:\n            arr[j + 1] = arr[j]\n            j -= 1\n        arr[j + 1] = key\n    return arr' },
        { id: 'al-4', title: '快速排序', language: 'algo', content: '**思想**：选基准值 pivot，分区为小于和大于基准的两部分，递归排序。**时间复杂度**：O(n log n)，最坏 O(n²)。**空间**：O(log n)。**不稳定**。', example: 'def quick_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    mid = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quick_sort(left) + mid + quick_sort(right)' },
        { id: 'al-5', title: '归并排序', language: 'algo', content: '**思想**：分治法——将数组分成两半，分别排序后再合并。**时间复杂度**：O(n log n)，**空间**：O(n)。**稳定**排序。', example: 'def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)\n\ndef merge(a, b):\n    result = []\n    i = j = 0\n    while i < len(a) and j < len(b):\n        if a[i] < b[j]: result.append(a[i]); i += 1\n        else: result.append(b[j]); j += 1\n    result.extend(a[i:]); result.extend(b[j:])\n    return result' },
        { id: 'al-6', title: '堆排序', language: 'algo', content: '**思想**：利用堆（优先队列）数据结构。建最大堆，反复取堆顶并调整。**时间复杂度**：O(n log n)，**空间**：O(1)。**不稳定**。', example: 'import heapq\ndef heap_sort(arr):\n    heapq.heapify(arr)\n    return [heapq.heappop(arr) for _ in range(len(arr))]' },
      ],
    },
    {
      topic: '搜索算法',
      items: [
        { id: 'al-7', title: '二分查找', language: 'algo', content: '**条件**：有序数组。每次取中间元素比较，缩小一半搜索范围。**时间复杂度**：O(log n)，**空间**：O(1)。', example: 'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = left + (right - left) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: left = mid + 1\n        else: right = mid - 1\n    return -1' },
        { id: 'al-8', title: 'DFS 深度优先搜索', language: 'algo', content: '**思想**：从起点出发，沿着一条路径走到尽头再回溯。用**栈**实现。适合路径搜索、连通性、排列组合。', example: 'def dfs(graph, start, visited=None):\n    if visited is None: visited = set()\n    visited.add(start)\n    for neighbor in graph[start]:\n        if neighbor not in visited:\n            dfs(graph, neighbor, visited)\n    return visited' },
        { id: 'al-9', title: 'BFS 广度优先搜索', language: 'algo', content: '**思想**：从起点出发，逐层扩展，用**队列**实现。适合最短路径（无权图）、层次遍历。**时间复杂度**：O(V+E)。', example: 'from collections import deque\ndef bfs(graph, start):\n    visited = {start}\n    q = deque([start])\n    while q:\n        node = q.popleft()\n        for nb in graph[node]:\n            if nb not in visited:\n                visited.add(nb)\n                q.append(nb)\n    return visited' },
      ],
    },
    {
      topic: '基础算法思想',
      items: [
        { id: 'al-10', title: '递归', language: 'algo', content: '**核心**：函数调用自身。必须有**终止条件**（base case）和**递归关系**。典型应用：树遍历、分治、回溯。', example: 'def factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n - 1)' },
        { id: 'al-11', title: '动态规划', language: 'algo', content: '**核心**：将大问题分解为重叠子问题，**记忆化**保存中间结果。关键要素：状态定义 + 状态转移方程 + 初始条件。', example: 'def fib(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b' },
        { id: 'al-12', title: '贪心算法', language: 'algo', content: '**核心**：每一步都做当前最优选择，不回溯。适用条件：贪心选择性质 + 最优子结构。经典问题：找零钱、活动选择。', example: 'def coin_change(coins, amount):\n    coins.sort(reverse=True)\n    count = 0\n    for coin in coins:\n        count += amount // coin\n        amount %= coin\n    return count if amount == 0 else -1' },
        { id: 'al-13', title: '双指针技巧', language: 'algo', content: '**核心**：用两个指针在数组/链表中移动，降低复杂度。类型：左右指针、快慢指针、滑动窗口。', example: 'def two_sum_sorted(arr, target):\n    l, r = 0, len(arr) - 1\n    while l < r:\n        s = arr[l] + arr[r]\n        if s == target: return [l, r]\n        elif s < target: l += 1\n        else: r -= 1\n    return []' },
      ],
    },
    {
      topic: '常用数据结构',
      items: [
        { id: 'al-14', title: '栈与队列', language: 'algo', content: '**栈**（LIFO）：后进先出。**队列**（FIFO）：先进先出。应用：括号匹配、BFS、表达式求值。', example: 'from collections import deque\n# 栈\nstack = []; stack.append(1); stack.pop()\n# 队列\nq = deque(); q.append(1); q.popleft()\n# 括号匹配\ndef is_valid(s):\n    stack, pairs = [], {\')\': \'(\'}\n    for c in s:\n        if c in pairs:\n            if not stack or stack.pop() != pairs[c]: return False\n        else: stack.append(c)\n    return not stack' },
        { id: 'al-15', title: '哈希表', language: 'algo', content: '**核心**：键→值的 O(1) 映射。常用于去重、计数、缓存。**空间换时间**的经典实现。', example: 'def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen: return [seen[comp], i]\n        seen[num] = i\n    return []' },
      ],
    },
    {
      topic: '图论算法',
      items: [
        { id: 'al-16', title: 'Dijkstra 最短路径', language: 'algo', content: '**思想**：贪心+松弛。每次选距离最小的未访问节点，更新邻居距离。**O((V+E)logV)** 堆优化。不可处理负权边。', example: 'import heapq\ndef dijkstra(graph, start):\n    dist = {start: 0}\n    pq = [(0, start)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist.get(u, float("inf")): continue\n        for v, w in graph[u].items():\n            nd = d + w\n            if nd < dist.get(v, float("inf")):\n                dist[v] = nd\n                heapq.heappush(pq, (nd, v))\n    return dist' },
        { id: 'al-17', title: '拓扑排序', language: 'algo', content: '**条件**：有向无环图（DAG）。Kahn算法（BFS+入度表）或 DFS。**O(V+E)**。应用：依赖管理、课程安排。', example: 'from collections import deque\ndef topo_sort(graph, indegree):\n    q = deque([u for u in indegree if indegree[u] == 0])\n    result = []\n    while q:\n        u = q.popleft()\n        result.append(u)\n        for v in graph[u]:\n            indegree[v] -= 1\n            if indegree[v] == 0: q.append(v)\n    return result if len(result) == len(graph) else []' },
        { id: 'al-18', title: 'Union-Find 并查集', language: 'algo', content: '**用途**：动态连通性问题。路径压缩+按秩合并，均摊复杂度接近 O(1)。应用：Kruskal、岛屿问题。', example: 'class UF:\n    def __init__(self, n):\n        self.p = list(range(n))\n        self.r = [0] * n\n    def find(self, x):\n        if self.p[x] != x:\n            self.p[x] = self.find(self.p[x])\n        return self.p[x]\n    def union(self, x, y):\n        rx, ry = self.find(x), self.find(y)\n        if rx == ry: return\n        if self.r[rx] < self.r[ry]: rx, ry = ry, rx\n        self.p[ry] = rx\n        if self.r[rx] == self.r[ry]: self.r[rx] += 1' },
      ],
    },
    {
      topic: '动态规划进阶',
      items: [
        { id: 'al-19', title: '01 背包问题', language: 'algo', content: 'N件物品，容量W，每件选或不选。`dp[i][w]`=前i件容量w的最大价值。可空间优化为一维（倒序遍历）。', example: 'def knapsack(weights, values, W):\n    dp = [0] * (W + 1)\n    for i in range(len(weights)):\n        for w in range(W, weights[i] - 1, -1):\n            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])\n    return dp[W]' },
        { id: 'al-20', title: 'LCS 最长公共子序列', language: 'algo', content: '两个序列的最长公共子序列。`dp[i][j]`=第一串前i个和第二串前j个的LCS。相等则`dp[i-1][j-1]+1`，否则取max。', example: 'def lcs(text1, text2):\n    m, n = len(text1), len(text2)\n    dp = [[0]*(n+1) for _ in range(m+1)]\n    for i in range(1, m+1):\n        for j in range(1, n+1):\n            if text1[i-1] == text2[j-1]:\n                dp[i][j] = dp[i-1][j-1] + 1\n            else:\n                dp[i][j] = max(dp[i-1][j], dp[i][j-1])\n    return dp[m][n]' },
      ],
    },
    {
      topic: '字符串算法',
      items: [
        { id: 'al-21', title: 'KMP 字符串匹配', language: 'algo', content: '**思想**：利用模式串自身前后缀相似性，匹配失败不回溯主串。构建 next 数组。**O(n+m)**。', example: 'def kmp(text, pattern):\n    if not pattern: return 0\n    nxt = [0] * len(pattern)\n    j = 0\n    for i in range(1, len(pattern)):\n        while j > 0 and pattern[i] != pattern[j]:\n            j = nxt[j-1]\n        if pattern[i] == pattern[j]: j += 1\n        nxt[i] = j\n    j = 0\n    for i in range(len(text)):\n        while j > 0 and text[i] != pattern[j]:\n            j = nxt[j-1]\n        if text[i] == pattern[j]: j += 1\n        if j == len(pattern): return i - j + 1\n    return -1' },
        { id: 'al-22', title: '滑动窗口', language: 'algo', content: '**思想**：维护窗口在数组上滑动，O(1)更新状态。应用：最长无重复子串、最小覆盖子串。', example: 'def length_of_longest_substring(s):\n    seen, left, max_len = {}, 0, 0\n    for right, c in enumerate(s):\n        if c in seen and seen[c] >= left:\n            left = seen[c] + 1\n        seen[c] = right\n        max_len = max(max_len, right - left + 1)\n    return max_len' },
      ],
    },
    {
      topic: '树结构进阶',
      items: [
        { id: 'al-23', title: 'Trie 字典树', language: 'algo', content: '**用途**：高效前缀匹配和字符串查找。每个节点存字符和子节点哈希表。插入/查找 O(L)。应用：自动补全、拼写检查。', example: 'class Trie:\n    def __init__(self):\n        self.root = {}\n    def insert(self, word):\n        node = self.root\n        for c in word:\n            if c not in node:\n                node[c] = {}\n            node = node[c]\n        node["#"] = True\n    def search(self, word):\n        node = self.root\n        for c in word:\n            if c not in node: return False\n            node = node[c]\n        return "#" in node' },
        { id: 'al-24', title: '线段树', language: 'algo', content: '**用途**：区间查询和更新（区间和、最值）。每个节点代表一个区间。建树 O(n)，查询/点更新 O(log n)。', example: 'class SegTree:\n    def __init__(self, arr):\n        self.n = len(arr)\n        self.t = [0] * (4 * self.n)\n        self._build(arr, 1, 0, self.n - 1)\n    def _build(self, arr, node, l, r):\n        if l == r: self.t[node] = arr[l]; return\n        mid = (l + r) // 2\n        self._build(arr, node*2, l, mid)\n        self._build(arr, node*2+1, mid+1, r)\n        self.t[node] = self.t[node*2] + self.t[node*2+1]\n    def query(self, ql, qr, node=1, l=0, r=None):\n        if r is None: r = self.n - 1\n        if ql > r or qr < l: return 0\n        if ql <= l and r <= qr: return self.t[node]\n        mid = (l + r) // 2\n        return self.query(ql, qr, node*2, l, mid) + self.query(ql, qr, node*2+1, mid+1, r)' },
        { id: 'al-25', title: '二叉搜索树 BST', language: 'algo', content: '**性质**：左 < 根 < 右。查找/插入 O(h)，平衡时 O(log n)。中序遍历得到有序序列。', example: 'class BST:\n    def __init__(self, val=None):\n        self.val = val\n        self.L = self.R = None\n    def insert(self, v):\n        if self.val is None: self.val = v; return\n        if v < self.val:\n            if self.L: self.L.insert(v)\n            else: self.L = BST(v)\n        else:\n            if self.R: self.R.insert(v)\n            else: self.R = BST(v)\n    def inorder(self):\n        res = []\n        if self.L: res += self.L.inorder()\n        if self.val is not None: res.append(self.val)\n        if self.R: res += self.R.inorder()\n        return res' },
      ],
    },
  ],
}

const selectedLang = ref('python')
const expandedTopics = ref<Record<string, boolean>>({})

onMounted(() => {
  const nav = localStorage.getItem('nav_to_knowledge')
  if (nav) {
    try {
      const { lang, topic } = JSON.parse(nav)
      if (lang && cards[lang]) {
        selectedLang.value = lang
        const idx = (cards[lang] || []).findIndex((g: any) =>
          g.items.some((item: any) => item.title === topic)
        )
        if (idx >= 0) expandedTopics.value[`${lang}-${idx}`] = true
      }
    } catch { /* ignore */ }
    localStorage.removeItem('nav_to_knowledge')
  }
})

function toggleTopic(lang: string, idx: number) {
  const key = `${lang}-${idx}`
  expandedTopics.value[key] = !expandedTopics.value[key]
}

function isExpanded(lang: string, idx: number) {
  return expandedTopics.value[`${lang}-${idx}`] ?? false
}

const currentCards = computed(() => cards[selectedLang.value] || [])
</script>

<template>
  <div class="cards-panel">
    <div class="lang-tabs">
      <button
        v-for="lang in languages"
        :key="lang.value"
        :class="['lang-tab', { active: selectedLang === lang.value }]"
        @click="selectedLang = lang.value"
      >
        {{ lang.icon }} {{ lang.label }}
      </button>
    </div>
    <div class="topics-list">
      <div v-for="(group, idx) in currentCards" :key="group.topic" class="topic-group">
        <div
          :class="['topic-header', { open: isExpanded(selectedLang, idx) }]"
          @click="toggleTopic(selectedLang, idx)"
        >
          <span class="arrow">{{ isExpanded(selectedLang, idx) ? '▾' : '▸' }}</span>
          <span class="topic-name">{{ group.topic }}</span>
          <span class="count">{{ group.items.length }}</span>
        </div>
        <div v-if="isExpanded(selectedLang, idx)" class="topic-items">
          <div v-for="item in group.items" :key="item.id" class="card-item">
            <div class="card-title">{{ item.title }}</div>
            <div class="card-content" v-html="item.content"></div>
            <div class="card-actions">
              <button class="card-btn ai-btn" @click="emit('ask-ai', `请详细讲解 ${item.language} 的 ${item.title}，并给出更多示例`)">
                💬 问 AI
              </button>
              <button class="card-btn run-btn" @click="emit('open-in-editor', item.example, item.language)">
                ▶ 运行
              </button>
              <a :href="bilibiliUrl(`${item.language} ${item.title} 教程`)" target="_blank" class="card-btn video-btn">
                📺 视频
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cards-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-card);
}
.lang-tabs {
  display: flex;
  gap: 2px;
  padding: 8px;
  flex-wrap: wrap;
}
.lang-tab {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--bg-tertiary);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.lang-tab.active {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
}
.topics-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}
.topic-group {
  margin-bottom: 4px;
}
.topic-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}
.topic-header:hover { background: var(--bg-secondary); }
.topic-header.open { background: var(--bg-secondary); }
.arrow { font-size: 10px; width: 12px; }
.topic-name { flex: 1; }
.count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 8px;
}
.topic-items { padding-left: 16px; }
.card-item {
  background: var(--bg-primary);
  border: 1px solid var(--bg-secondary);
  border-radius: 8px;
  padding: 10px;
  margin: 4px 0;
}
.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 6px;
}
.card-content {
  font-size: 12px;
  color: #bac2de;
  line-height: 1.6;
}
.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.card-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-secondary);
  font-size: 11px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.card-btn:hover { filter: brightness(1.2); }
.ai-btn { border-color: var(--accent); color: var(--accent); }
.run-btn { border-color: #a6e3a1; color: #a6e3a1; }
.video-btn { border-color: #f38ba8; color: #f38ba8; }
.video-btn:hover { background: #f38ba822; }
</style>
