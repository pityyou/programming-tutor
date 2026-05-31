<script setup lang="ts">
import { ref, computed } from 'vue'

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
  { value: 'csharp', label: 'C#', icon: '🎯' },
  { value: 'go', label: 'Go', icon: '🔵' },
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
        { id: 'py-16', title: '正则表达式', language: 'python', content: '`re` 模块提供正则表达式支持。常用：`search()`、`match()`、`findall()`、`sub()`、`split()`。使用 `r""` 原始字符串避免转义。', example: 'import re\n\ntext = "我的邮箱是 alice@example.com，电话是 138-0000-1234"\n\n# 查找邮箱\nemail = re.search(r\'[\\w.]+@[\\w.]+\\.[a-z]+\', text)\nprint(email.group())  # alice@example.com\n\n# 查找所有数字\nphones = re.findall(r\'\\d{3}-\\d{4}-\\d{4}\', text)\n\n# 替换\ncleaned = re.sub(r\'\\d{3}-(\\d{4})-(\\d{4})\', r\'***-\\1-\\2\', text)' },
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
        { id: 'js-8', title: '事件处理', language: 'javascript', content: '`addEventListener` 绑定事件。事件冒泡从内到外传播。`event.target` 是触发元素，`event.currentTarget` 是监听元素。`preventDefault()` 阻止默认行为。', example: '// 事件监听\nconst btn = document.querySelector("#btn");\nbtn.addEventListener("click", (e) => {\n  e.preventDefault();\n  console.log("点击了按钮");\n});\n\n// 事件委托（利用冒泡）\ndocument.querySelector("#list").addEventListener("click", (e) => {\n  if (e.target.matches(".item")) {\n    console.log("点击了:", e.target.textContent);\n  }\n});\n\n// 键盘事件\ndocument.addEventListener("keydown", (e) => {\n  if (e.key === "Escape") console.log("按了 ESC");\n});' },
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
        { id: 'jv-9', title: 'Stream API', language: 'java', content: 'Java 8+ Stream 提供函数式数据处理：`filter`、`map`、`sorted`、`collect`。惰性求值，终端操作触发计算。`Collectors` 工具类提供常用收集器。', example: 'import java.util.*;\nimport java.util.stream.*;\n\nList<String> names = List.of("Alice", "Bob", "Charlie", "David");\n\n// Stream 链式操作\nList<String> result = names.stream()\n    .filter(n -> n.length() > 3)          // 过滤\n    .map(String::toUpperCase)              // 转换\n    .sorted()                              // 排序\n    .collect(Collectors.toList());         // 收集\n\n// 分组\nMap<Character, List<String>> grouped = names.stream()\n    .collect(Collectors.groupingBy(n -> n.charAt(0)));\n\n// 统计\nlong count = names.stream().filter(n -> n.startsWith("A")).count();' },
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
        { id: 'cp-9', title: '移动语义', language: 'cpp', content: '移动语义（C++11）避免不必要的深拷贝。`std::move` 将左值转为右值引用，触发移动构造函数。`&&` 是右值引用，用于移动构造和完美转发。', example: '#include <string>\n#include <vector>\n\nstring createString() {\n    string s = "hello world this is a long string";\n    return s;  // RVO 或移动（自动）\n}\n\nint main() {\n    vector<int> v1 = {1, 2, 3, 4, 5};\n    vector<int> v2 = move(v1);  // v1 的资源转移到 v2\n    // v1 现在为空，不应再使用\n    \n    cout << "v2 size: " << v2.size() << endl;\n    cout << "v1 size: " << v1.size() << endl;  // 0\n    \n    return 0;\n}' },
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
        { id: 'c-6', title: '文件操作', language: 'c', content: '`fopen` 打开文件（模式：`r`读、`w`写、`a`追加、`rb`/`wb` 二进制）。`fprintf`/`fscanf` 格式化读写，`fread`/`fwrite` 二进制读写。`fclose` 关闭。', example: '#include <stdio.h>\n\nint main() {\n    // 写文件\n    FILE* fp = fopen("test.txt", "w");\n    if (!fp) { perror("打开失败"); return 1; }\n    fprintf(fp, "Hello, File!\\n");\n    fprintf(fp, "第二行\\n");\n    fclose(fp);\n    \n    // 读文件\n    fp = fopen("test.txt", "r");\n    char line[256];\n    while (fgets(line, sizeof(line), fp)) {\n        printf("%s", line);\n    }\n    fclose(fp);\n    \n    return 0;\n}' },
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
        { id: 'go-9', title: 'error 与 panic', language: 'go', content: 'Go 不使用异常，而是通过返回 `error` 值来处理错误。`if err != nil` 是 Go 的标志性写法。`panic` 仅在不可恢复的错误时使用，`recover` 在 defer 中捕获。', example: 'package main\n\nimport (\n    "fmt"\n    "os"\n)\n\nfunc readFile(path string) error {\n    file, err := os.Open(path)\n    if err != nil {\n        return fmt.Errorf("打开文件失败 %s: %w", path, err)\n    }\n    defer file.Close()\n    \n    // 读取文件...\n    return nil\n}\n\nfunc main() {\n    if err := readFile("test.txt"); err != nil {\n        fmt.Println("错误:", err)\n        return\n    }\n    fmt.Println("读取成功")\n    \n    // recover 示例\n    defer func() {\n        if r := recover(); r != nil {\n            fmt.Println("捕获到 panic:", r)\n        }\n    }()\n}' },
      ],
    },
  ],
}

const selectedLang = ref('python')
const expandedTopics = ref<Record<string, boolean>>({})

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
