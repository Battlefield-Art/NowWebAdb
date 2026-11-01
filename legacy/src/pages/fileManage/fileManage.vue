<template>
  <div class="page file-page">
    <header class="page-head">
      <div class="page-heading-copy">
        <p class="eyebrow">Storage / File System</p>
        <h1 class="page-title">文件管理</h1>
        <p class="page-sub">浏览设备目录，上传、下载或整理文件与文件夹。拖入文件即可上传到当前目录。</p>
      </div>
      <div class="page-actions">
        <el-input
          v-model="searchValue"
          class="file-search"
          size="default"
          placeholder="搜索当前目录"
          clearable
          @change="searchFile"
          @input="searchFile"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button @click="getFileList('')"><el-icon><Refresh /></el-icon>刷新</el-button>
        <el-popover placement="bottom-end" trigger="click" :width="180" :popper-style="{ padding: '5px' }">
          <template #reference>
            <el-button circle aria-label="更多目录操作"><el-icon><More /></el-icon></el-button>
          </template>
          <button class="menu-item" @click="copyPath"><el-icon><CopyDocument /></el-icon>复制路径</button>
          <button class="menu-item" @click="jumpPath"><el-icon><Position /></el-icon>跳转目录</button>
          <button class="menu-item" @click="handleBackPath(0)"><el-icon><House /></el-icon>回到根目录</button>
        </el-popover>
      </div>
    </header>

    <div class="path-bar surface">
      <button class="path-back" aria-label="返回上一级" @click="handleBackParent">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <div class="crumbs">
        <template v-for="(dirName, index) in dirNameList" :key="index">
          <el-icon v-if="index > 0" class="crumb-sep"><ArrowRight /></el-icon>
          <button
            class="crumb"
            :class="{ 'is-current': nowDir === dirName && index === dirNameList.length - 1 }"
            @click="handleBackPath(index)"
          >
            {{ dirName }}
          </button>
        </template>
      </div>
      <span class="path-count mono">{{ fileItemList.length }} ITEMS</span>
    </div>

    <div class="file-toolbar">
      <div class="toolbar-group">
        <el-button @click="createNewFolder"><el-icon><FolderAdd /></el-icon>新建文件夹</el-button>
        <el-upload ref="upFileRef" :auto-upload="false" :show-file-list="false" :on-change="handleUploadFile">
          <template #trigger>
            <el-button><el-icon><Upload /></el-icon>上传文件</el-button>
          </template>
        </el-upload>
      </div>
      <div class="toolbar-group">
        <el-button :disabled="!canDownload" @click="topDownloadFile"><el-icon><Download /></el-icon>下载</el-button>
        <el-button :disabled="!canRename" @click="topRenameFile"><el-icon><EditPen /></el-icon>重命名</el-button>
        <el-button type="danger" plain :disabled="!canDelete" @click="topDeleteFile"><el-icon><Delete /></el-icon>删除</el-button>
        <el-button :disabled="!canInspect" @click="topGetFileDetail"><el-icon><InfoFilled /></el-icon>详细信息</el-button>
      </div>
    </div>

    <section
      id="showFileCard"
      class="file-card surface"
      :class="{ 'drag-over': isDragging }"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div v-if="isDragging" class="drop-overlay">
        <el-icon><Upload /></el-icon>
        <strong>释放以上传文件</strong>
        <span>文件将写入 {{ dirPathName }}</span>
      </div>

      <header class="file-table-head">
        <span class="cell-check">
          <el-checkbox
            :model-value="selectStatus === 1"
            :indeterminate="selectStatus === 2 || selectStatus === 3"
            :disabled="!fileItemList.length"
            aria-label="全选"
            @change="handleSelectAll"
          />
        </span>
        <button class="cell-name sort-btn" @click="sortFileList(sortType === 'desc' ? 'asc' : 'desc')">
          名称
          <el-icon><Bottom v-if="sortType === 'desc'" /><Top v-else /></el-icon>
        </button>
        <span class="cell-size">大小</span>
        <span class="cell-time">修改时间</span>
        <span class="cell-time cell-created">创建时间</span>
        <span class="cell-actions"></span>
      </header>

      <el-scrollbar :style="{ height: listHeight + 'px' }">
        <div v-if="fileItemList.length > 0" class="file-rows">
          <div
            v-for="(fileItem, index) in fileItemList"
            :key="index"
            class="file-row"
            :class="{ 'is-selected': fileItem.isSelect }"
            @click="getFileList(fileItem.name)"
          >
            <span class="cell-check" @click.stop>
              <el-checkbox
                :model-value="fileItem.isSelect"
                :aria-label="`选择 ${fileItem.name}`"
                @change="handelSelectItem(fileItem)"
              />
            </span>
            <span class="cell-name">
              <SvgIcon v-if="fileItem.type === ''" icon="FileTypeFolderIcon" class="file-icon" />
              <SvgIcon v-else-if="imgType.includes(fileItem.type)" icon="FileTypeImgIcon" class="file-icon" />
              <SvgIcon v-else-if="videoType.includes(fileItem.type)" icon="FileTypeVideoIcon" class="file-icon" />
              <SvgIcon v-else-if="audioType.includes(fileItem.type)" icon="FileTypeAudioIcon" class="file-icon" />
              <SvgIcon v-else-if="textType.includes(fileItem.type)" icon="FileTypeTextIcon" class="file-icon" />
              <SvgIcon v-else icon="FileTypeNoneIcon" class="file-icon" />
              <span class="file-name" :class="{ 'is-dir': fileItem.type === '' }">{{ fileItem.name }}</span>
            </span>
            <span class="cell-size mono">{{ fileItem.numType === 8 ? fileItem.size : '—' }}</span>
            <span class="cell-time mono">{{ fileItem.modifyTime }}</span>
            <span class="cell-time cell-created mono">{{ fileItem.createTime }}</span>
            <span class="cell-actions" @click.stop>
              <el-popover placement="bottom-end" trigger="click" :width="160" :popper-style="{ padding: '5px' }">
                <template #reference>
                  <button class="row-more" aria-label="文件操作"><el-icon><More /></el-icon></button>
                </template>
                <button class="menu-item" @click="rightDownloadFile(fileItem.name, fileItem.numType)">
                  <el-icon><Download /></el-icon>下载
                </button>
                <button class="menu-item" @click="renameFile(fileItem.name)"><el-icon><EditPen /></el-icon>重命名</button>
                <button class="menu-item" @click="deleteFileSingle(fileItem.name, fileItem.numType)">
                  <el-icon><Delete /></el-icon>删除
                </button>
                <button class="menu-item" @click="getFileDetail(fileItem.name)"><el-icon><InfoFilled /></el-icon>详细信息</button>
              </el-popover>
            </span>
          </div>
        </div>
        <div v-else class="file-empty">
          <el-empty description="当前目录没有文件" :image-size="72" />
        </div>
      </el-scrollbar>

      <footer class="file-foot">
        <span class="mono">{{ dirPathName }}</span>
        <span v-if="selectStatus === 0">未选择项目</span>
        <span v-else>已选择 {{ fileItemList.filter(item => item.isSelect).length }} 项</span>
      </footer>
    </section>
  </div>
  <FileDetailDrawer ref="fileDetailDrawerRef" />
</template>

<script setup>
import {
  ArrowLeft,
  ArrowRight,
  Bottom,
  CopyDocument,
  Delete,
  Download,
  EditPen,
  FolderAdd,
  House,
  InfoFilled,
  More,
  Position,
  Refresh,
  Search,
  Top,
  Upload,
} from "@element-plus/icons-vue";
import SvgIcon from "@/components/SvgIcon.vue";
import { getAdbInstance, executeCommand, formatSize } from "@/utils/adbManager.js";
import useWindowResize from "@/utils/useWindowResize.js";
import FileDetailDrawer from "@/pages/fileManage/fileDetailDrawer.vue";
import { Consumable } from "@yume-chan/stream-extra";

let syncObject
let imgType = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'psd', 'raw', 'heif']
let videoType = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'rmvb', 'mkv', 'webm', 'mpg', 'mpeg', '3gp']
let audioType = ['mp3', 'wav', 'wma', 'flac', 'aac', 'ape', 'ogg', 'm4a', 'amr', 'mid']
let textType = ['txt', 'md', 'log']

const { width, height } = useWindowResize()
const dirPathName = ref('/sdcard')
const fileItemList = ref([])
const fileDetailDrawerRef = ref(null)
const upFileRef = ref(null)
const nowFileInfo = ref({})
const sortType = ref('asc')
const searchValue = ref('')
const isDragging = ref(false)
const copyFileList = ref([])

const listHeight = computed(() => Math.max(240, height.value - 400))

const nowDir = computed(() => {
  // 先判断路径是不是只有'/'，如果不是则用'/'切割路径字符串，获取最后一个元素
  if (dirPathName.value === '/') {
    return '根目录'
  } else {
    return dirPathName.value.split('/').filter(item => item !== '').pop()
  }
})
const selectStatus = computed(() => {
  if (fileItemList.value.length === 0) {
    return 0;
  }
  // 检查是否所有对象的 isSelect 值都为 true
  const allTrue = fileItemList.value.every(obj => obj.isSelect === true);
  
  // 检查是否至少有一个对象的 isSelect 值为 true
  const hasTrue = fileItemList.value.some(obj => obj.isSelect === true);
  
  // 检查是否只有一个对象的 isSelect 值为 true
  const onlyOneTrue = fileItemList.value.filter(obj => obj.isSelect === true).length === 1;
  
  if (allTrue) {
    return 1;
  } else if (onlyOneTrue) {
    return 3;
  } else if (hasTrue) {
    return 2;
  } else {
    return 0;
  }
})
const canDownload = computed(() => selectStatus.value === 1 || selectStatus.value === 2 || selectStatus.value === 3)
const canRename = computed(() => selectStatus.value === 3)
const canDelete = computed(() => selectStatus.value === 1 || selectStatus.value === 2 || selectStatus.value === 3)
const canInspect = computed(() => selectStatus.value === 3)
const dirNameList = computed(() => {
  if (dirPathName.value === '/') {
    return ['根目录']
  } else {
    return ['根目录', ...dirPathName.value.split('/').filter(item => item !== '')]
  }
})
const getFileList = async (filePath) => {
  fileItemList.value = []
  let nowDirPath = dirPathName.value
  if (filePath) {
    nowDirPath = dirPathName.value + '/' + filePath
  }
  syncObject = await getAdbInstance().sync()
  console.log(filePath)
  // 在获取前先判断是否为文件夹
  const isDirectory = await syncObject.isDirectory(nowDirPath)
  if (isDirectory) {
    dirPathName.value = nowDirPath
  } else {
    console.log('不是文件夹')
  }
  let num = 0
  for await (const entry of syncObject.opendir(dirPathName.value)) {
    if (entry.name === '.' || entry.name === '..') {
      continue
    }
    num++
    fileItemList.value.push({
      id: num,
      name: entry.name,
      size: formatSize(entry.size),
      createTime: timestampToTime(entry.ctime),
      modifyTime: timestampToTime(entry.mtime),
      isSelect: false,
      numType: entry.type,
      type: entry.type === 8 ? entry.name.split('.').pop() : '' // 8是文件，其他是文件夹
    })
  }
  await sortFileList('asc')
}
const searchFile = () => {
  if (searchValue.value === '') {
    fileItemList.value = copyFileList.value
  } else {
    fileItemList.value = copyFileList.value.filter(item => item.name.includes(searchValue.value))
  }
}
// 将类似这种1533657660n的bigint转换为xxxx-xx-xx xx:xx:xx格式
const timestampToTime = (bigIntValue) => {
  try {
    // 检查输入值是否有效
    if (!bigIntValue || bigIntValue === 0n) {
      return '--';
    }
    
    // 转换为毫秒级别的时间戳
    const timestamp = Number(bigIntValue) * 1000;
    
    // 检查时间戳是否有效
    if (isNaN(timestamp) || timestamp <= 0) {
      return '--';
    }
    
    // 创建一个Date对象
    const date = new Date(timestamp);
    
    // 检查Date对象是否有效
    if (isNaN(date.getTime())) {
      return '--';
    }
    
    // 获取年、月、日、小时、分钟、秒
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // 再次检查所有值是否有效
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return '--';
    }
    
    // 格式化为字符串
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.warn('时间戳转换失败:', bigIntValue, error);
    return '--';
  }
}
// 根据点击的文件夹名字返回到指定路径
const handleBackPath = (index) => {
  console.log('点击路径')
  if (index === 0) {
    dirPathName.value = '/'
  } else {
    const dirNameList = dirPathName.value.split('/').filter(item => item !== '')
    dirPathName.value = '/' + dirNameList.slice(0, index).join('/')
  }
  getFileList('')
}
// 返回上一级目录
const handleBackParent = () => {
  console.log('返回上一级目录')
  if (dirPathName.value === '/') {
    ElNotification({
      title: '提示',
      message: '已经是根目录了',
      type: 'warning'
    })
    return
  }
  const dirNameList = dirPathName.value.split('/').filter(item => item !== '')
  dirPathName.value = '/' + dirNameList.slice(0, dirNameList.length - 1).join('/')
  getFileList('')
}
const handelSelectItem = (item) => {
  console.log('选中点击文件夹', selectStatus.value)
  fileItemList.value.forEach((fileItem) => {
    if (fileItem.id === item.id) {
      fileItem.isSelect = !fileItem.isSelect
    }
  })
}
const handleSelectAll = () => {
  console.log('全选')
  if (selectStatus.value === 0) {
    fileItemList.value.forEach((fileItem) => {
      fileItem.isSelect = true
    })
  } else {
    fileItemList.value.forEach((fileItem) => {
      fileItem.isSelect = false
    })
  }
}
const topGetFileDetail = async () => {
  if (selectStatus.value === 3) {
    fileItemList.value.forEach((fileItem) => {
      if (fileItem.isSelect) {
        getFileDetail(fileItem.name)
      }
    })
  }
}
const getFileDetail = async (fileName) => {
  console.log('获取文件详细信息')
  // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
  dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
  let nowDirPath
  if (dirPathName.value === '/') {
    nowDirPath = dirPathName.value + fileName
  } else {
    nowDirPath = dirPathName.value + '/' + fileName
  }
  console.log(nowDirPath)
  const res = await executeCommand(`stat '${nowDirPath}'`)
  const accessRegex = /Access:\s*\(([^)]*)\)/;
  const gidRegex = /Gid:\s*\(\s*\d+\/([^)]*)\)/;
  
  const accessMatch = res.match(accessRegex);
  const gidMatch = res.match(gidRegex);
  
  const accessValue = accessMatch ? accessMatch[1] : null;
  const gidValue = gidMatch ? gidMatch[1] : null;
  
  const stat = await syncObject.stat(nowDirPath);
  nowFileInfo.value = {
    name: fileName,
    path: dirPathName.value,
    size: stat.size,
    createTime: timestampToTime(stat.ctime),
    modifyTime: timestampToTime(stat.mtime),
    accessTime: timestampToTime(stat.atime),
    mode: stat.mode,
    uid: stat.uid,
    gid: stat.gid + (gidValue ? `(${gidValue})` : ''),
    type: stat.type,
    permissions: accessValue.replace('/', ' ')
  }
  fileDetailDrawerRef.value.openDrawer(nowFileInfo.value)
}
const copyPath = () => {
  console.log('复制路径')
  // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
  dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
  try {
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.value = dirPathName.value;
    document.body.appendChild(input);
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      ElNotification({
        title: '提示',
        message: '复制成功',
        type: 'success'
      });
    }).catch(() => {
      ElNotification({
        title: '错误',
        message: '复制失败',
        type: 'error'
      });
    }).finally(() => {
      document.body.removeChild(input);
    });
  } catch (error) {
    console.error('复制路径出错:', error);
    ElNotification({
      title: '错误',
      message: '复制路径出错',
      type: 'error'
    });
  }
}
const jumpPath = () => {
  console.log('跳转目录', dirPathName.value)
  // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
  dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
  // 弹出提示框，并将输入框默认值设置为当前路径
  ElMessageBox.prompt('请输入目录路径', '跳转目录', {
    inputValue: dirPathName.value,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.*/,
    inputErrorMessage: '请输入目录路径',
  }).then(({value}) => {
    console.log(value)
    // 点击确定按钮后，将输入框的值赋给当前路径
    dirPathName.value = value;
    // 获取当前路径下的文件列表
    getFileList('');
  }).catch(() => {
    console.log('取消跳转目录');
  });
}
const createNewFolder = () => {
  console.log('创建新文件夹')
  // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
  dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
  ElMessageBox.prompt('请输入文件夹名称', '创建新文件夹', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.*/,
    inputErrorMessage: '请输入文件夹名称',
  }).then(({value}) => {
    let creatPath = dirPathName.value === '/' ? '/' + value : dirPathName.value + '/' + value
    executeCommand('mkdir ' + creatPath).then((res) => {
      console.log('创建新文件夹', res)
      if (res) {
        if (res.includes('File exists') || res.includes('Read-only')) {
          ElNotification({
            title: '创建失败',
            message: res.split(':')[2],
            type: 'warning'
          });
          return
        }
      }
      ElNotification({
        title: '提示',
        message: '创建成功',
        type: 'success'
      });
      getFileList('')
    }).catch((err) => {
      console.log('创建新文件夹', err)
      ElNotification({
        title: '错误',
        message: '创建失败',
        type: 'error'
      });
    });
  });
}
const handleUploadFile = async (event, file, fileList, isDrag) => {
  try {
    // 创建一个 FileReader 对象
    const reader = new FileReader();
    
    // 使用 Promise 包装文件读取操作，以便异步处理
    const readFile = () => {
      return new Promise((resolve, reject) => {
        // 设置文件读取完成时的回调函数
        reader.onload = (event) => {
          // 文件读取成功，将文件内容作为 resolve 的参数返回
          resolve(event.target.result);
        };
        
        // 设置文件读取出错时的回调函数
        reader.onerror = (error) => {
          // 文件读取失败，将错误作为 reject 的参数返回
          reject(error);
        };
        
        // 开始读取文件内容
        reader.readAsArrayBuffer(isDrag ? file[0] : file[0].raw);
      });
    };
    
    // 读取文件内容(这里读取到的是 ArrayBuffer 类型，下面在读取流时需要将其转换为 Uint8Array 类型)
    const fileContent = await readFile();
    // 创建一个可读流，将文件内容传入
    const fileStream = new ReadableStream({
      start(controller) {
        // 在流开始时，将文件内容通过 controller.enqueue() 添加到可读流中
        controller.enqueue(new Consumable(new Uint8Array(fileContent)));
        // 文件内容添加完毕后，关闭可读流
        controller.close();
      },
    });
    // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
    dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
    // 将可读流传递给 sync.write() 函数，以写入到目标位置
    await syncObject.write({
      filename: dirPathName.value === '/' ? '/' + file[0].name : dirPathName.value + '/' + file[0].name,
      file: fileStream,
    });
  } catch (error) {
    // 处理文件读取或写入过程中的错误
    console.error('文件处理失败:', error);
  }
  upFileRef.value.clearFiles();
  await getFileList('')
}
const deleteFileSingle = async (fileName, type) => {
  // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
  dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
  console.log('删除文件', dirPathName.value === '/' ? '/' + fileName : dirPathName.value + '/' + fileName)
  // 弹出提示框
  ElMessageBox.confirm('是否删除文件/文件夹？', '删除文件', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    if (type === 8) {
      await getAdbInstance().rm(dirPathName.value === '/' ? '/' + fileName : dirPathName.value + '/' + fileName);
    } else {
      await getAdbInstance().rm(dirPathName.value === '/' ? '/' + fileName : dirPathName.value + '/' + fileName, {recursive: true});
    }
    ElNotification({
      title: '提示',
      message: '删除成功',
      type: 'success'
    });
    await getFileList('')
  }).catch(() => {
    console.log('取消删除文件');
  });
}
const topDeleteFile = async () => {
  ElMessageBox.confirm('是否删除选中的文件/文件夹？', '删除文件', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    for (let i = 0; i < fileItemList.value.length; i++) {
      if (fileItemList.value[i].isSelect) {
        if (fileItemList.value[i].type === 8) {
          await getAdbInstance().rm(dirPathName.value === '/' ? '/' + fileItemList.value[i].name : dirPathName.value + '/' + fileItemList.value[i].name);
        } else {
          await getAdbInstance().rm(dirPathName.value === '/' ? '/' + fileItemList.value[i].name : dirPathName.value + '/' + fileItemList.value[i].name, {recursive: true});
        }
      }
    }
    ElNotification({
      title: '提示',
      message: '删除成功',
      type: 'success'
    });
    await getFileList('')
  }).catch(() => {
    console.log('取消删除文件');
  });
}
const renameFile = async (fileName) => {
  ElMessageBox.prompt('请输入新的文件名', '重命名', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.*/,
    inputValue: fileName,
    inputErrorMessage: '请输入文件名',
  }).then(async ({value}) => {
    if (value === '') {
      ElNotification({
        title: '提示',
        message: '文件名不能为空',
        type: 'warning'
      });
      return
    }
    if (fileName === value) {
      ElNotification({
        title: '提示',
        message: '文件名相同',
        type: 'warning'
      });
      return
    }
    if (fileName.indexOf('/') !== -1) {
      ElNotification({
        title: '提示',
        message: '文件名不能包含/',
        type: 'warning'
      });
      return
    }
    // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
    dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
    let originalPath = dirPathName.value === '/' ? '/' + fileName : dirPathName.value + '/' + fileName
    let renamePath = dirPathName.value === '/' ? '/' + value : dirPathName.value + '/' + value
    console.log('重命名文件', originalPath, renamePath)
    const res = await executeCommand(`mv ${originalPath} ${renamePath}`)
    if (res) {
      if (res.includes('File exists') || res.includes('Read-only')) {
        ElNotification({
          title: '创建失败',
          message: res.split(':')[2],
          type: 'warning'
        });
        return
      }
    }
    ElNotification({
      title: '提示',
      message: '重命名成功',
      type: 'success'
    });
    await getFileList('')
  });
}
const topRenameFile = async () => {
  if (selectStatus.value === 3) {
    for (const item of fileItemList.value) {
      if (item.isSelect) {
        await renameFile(item.name)
      }
    }
  }
}
const downloadFile = async (fileName) => {
  // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
  dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
  let readPath = dirPathName.value === '/' ? '/' + fileName : dirPathName.value + '/' + fileName
  console.log('下载文件地址', readPath)
  const connect = await syncObject.read(readPath);
  
  let chunks = [];
  const writableStream = new WritableStream({
    write(chunk) {
      chunks.push(chunk);
    },
  });
  await connect.pipeTo(writableStream);
  // Combine all Uint8Arrays into one
  const combinedUint8Array = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    combinedUint8Array.set(chunk, offset);
    offset += chunk.byteLength;
  }
  // Create Blob from Uint8Array
  const blob = new Blob([combinedUint8Array]);
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  // Cleanup
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
const rightDownloadFile = async (fileName, type) => {
  if (type === 8) {
    await downloadFile(fileName)
  } else {
    // 判断dirPathName.value头部是否有多余的'/'，如果有多余的'/'，只保留一个，如果没有则不变
    dirPathName.value = dirPathName.value.replace(/^\/{2,}/, '/');
    let filePath = dirPathName.value === '/' ? '/' + fileName : dirPathName.value + '/' + fileName
    console.log('下载文件地址', filePath)
    await executeCommand(`tar -cvf ${filePath}.tar ${filePath}`)
    await downloadFile(fileName + '.tar')
    await executeCommand(`rm ${filePath}.tar`)
  }
}
const topDownloadFile = async () => {
  for (let i = 0; i < fileItemList.value.length; i++) {
    if (fileItemList.value[i].isSelect) {
      await rightDownloadFile(fileItemList.value[i].name, fileItemList.value[i].numType)
    }
  }
}
// 排序
const sortFileList = async (type) => {
  if (type === 'asc') {
    fileItemList.value.sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
    sortType.value = 'asc'
  } else {
    fileItemList.value.sort((a, b) => {
      return b.name.localeCompare(a.name)
    })
    sortType.value = 'desc'
  }
  copyFileList.value = JSON.parse(JSON.stringify(fileItemList.value))
}

const handleDrop = (e) => {
  isDragging.value = false;
  e.preventDefault();
  let files = e.dataTransfer.files;
  console.log(files)
  let fileList = []
  handleUploadFile(e, files, fileList, true)
}
const handleDragOver = (e) => {
  e.preventDefault();
  console.log('进入')
  isDragging.value = true;
  return false; // 阻止默认行为
}
const handleDragLeave = (el) => {
  console.log('离开')
  if (!document.getElementById('showFileCard').contains(el.relatedTarget)) {
    isDragging.value = false;
  }
}
onMounted(() => {
  getFileList('')
})
onUnmounted(() => {
  console.log('销毁同步连接')
  syncObject?.dispose();
})
</script>

<style scoped>
.file-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-search {
  width: 220px;
}

.path-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 6px 12px 6px 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}

.path-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--ink-soft);
  cursor: pointer;
  flex: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.path-back:hover {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}

.crumb-sep {
  flex: none;
  font-size: 12px;
  color: var(--muted-2);
}

.crumb {
  max-width: 220px;
  padding: 4px 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.crumb:hover {
  background: var(--surface-2);
  color: var(--ink);
}

.crumb.is-current {
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-weight: 600;
}

.path-count {
  margin-left: auto;
  flex: none;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--muted-2);
}

.file-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.file-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
}

.file-card.drag-over {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(228, 87, 46, 0.12);
}

.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(251, 236, 229, 0.94);
  color: var(--accent-ink);
  pointer-events: none;
}

.drop-overlay .el-icon {
  font-size: 30px;
}

.drop-overlay strong {
  font-size: 15px;
}

.drop-overlay span {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--muted);
}

.file-table-head,
.file-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 92px 156px 156px 46px;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.file-table-head {
  height: 38px;
  padding: 0 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.cell-check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sort-btn {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  gap: 5px;
}

.sort-btn:hover {
  color: var(--ink);
}

.cell-size,
.cell-time {
  font-size: 11.5px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-actions {
  display: flex;
  justify-content: flex-end;
}

.file-rows {
  padding: 4px 0;
}

.file-row {
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid var(--line-soft);
  cursor: pointer;
  transition: background-color 0.14s ease;
}

.file-row:last-child {
  border-bottom: 0;
}

.file-row:hover {
  background: var(--surface-2);
}

.file-row.is-selected {
  background: var(--accent-soft);
}

.file-icon {
  flex: none;
  width: 20px;
  height: 20px;
}

.file-name {
  min-width: 0;
  font-size: 12.5px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-name.is-dir {
  font-weight: 600;
}

.row-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.row-more:hover {
  background: var(--surface);
  border-color: var(--line);
  color: var(--ink);
}

.file-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.file-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
  padding: 0 14px;
  border-top: 1px solid var(--line);
  background: var(--surface-2);
  font-size: 11.5px;
  color: var(--muted);
}

.file-foot .mono {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-soft);
  font-family: var(--sans);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.menu-item:hover {
  background: var(--accent-soft);
  color: var(--accent-ink);
}

@media (max-width: 1100px) {
  .file-table-head,
  .file-row {
    grid-template-columns: 42px minmax(0, 1fr) 84px 150px 46px;
  }

  .cell-created {
    display: none;
  }
}

@media (max-width: 860px) {
  .file-table-head,
  .file-row {
    grid-template-columns: 40px minmax(0, 1fr) 78px 46px;
  }

  .cell-size {
    display: none;
  }

  .file-search {
    width: 180px;
  }

  .crumbs .crumb {
    max-width: 130px;
  }
}

@media (max-width: 620px) {
  .path-count {
    display: none;
  }

  .cell-time {
    display: none;
  }

  .file-table-head,
  .file-row {
    grid-template-columns: 36px minmax(0, 1fr) 40px;
    gap: 6px;
    padding: 0 8px;
  }

  .file-search {
    width: 100%;
  }
}
</style>
