import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="studio-panel mx-auto max-w-3xl p-8 text-center sm:p-10">
      <p className="studio-eyebrow">页面不存在</p>
      <h1 className="studio-title mt-3 text-4xl leading-tight sm:text-5xl">没有找到这个练习页面</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300">
        这个链接可能已经失效，或者你打开了一个不存在的播客、剧集或资料库地址。
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="studio-button-primary">回到首页</Link>
        <Link to="/search?q=conversation" className="studio-button-ghost">搜索播客</Link>
      </div>
    </section>
  )
}
