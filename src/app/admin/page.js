"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./Admin.module.css";

export default function AdminPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", prompt: "", category: "Personal" });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const fetchItems = async () => {
    const res = await fetch("/api/portfolio");
    const data = await res.json();
    setItems(data);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      let imageUrl = "/placeholder.jpg";

      // Upload image first
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          imageUrl = uploadData.url;
        }
      }

      // Save portfolio item
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrl }),
      });

      if (res.ok) {
        setMessage("✅ 作品上传成功！");
        setForm({ title: "", description: "", prompt: "", category: "Personal" });
        setImageFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchItems();
      } else {
        setMessage("❌ 上传失败，请重试");
      }
    } catch (err) {
      setMessage("❌ 错误：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("确定要删除这个作品吗？")) return;
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchItems();
  };

  return (
    <div className={styles.adminPage}>
      <header className={styles.adminHeader}>
        <h1>plusesee.me / <span>作品管理后台</span></h1>
        <a href="/" className={styles.backLink}>← 返回首页</a>
      </header>

      <div className={styles.adminBody}>
        {/* Upload Form */}
        <section className={styles.formSection}>
          <h2>上传新作品</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.imageUploadZone} onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className={styles.imagePreview} />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <span>点击选择图片</span>
                  <small>JPG / PNG / WEBP</small>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />

            <div className={styles.fields}>
              <input
                className={styles.input}
                type="text"
                placeholder="作品标题 *"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
              <select
                className={styles.input}
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                <option>Personal</option>
                <option>Commercial</option>
                <option>Others</option>
              </select>
              <textarea
                className={styles.textarea}
                placeholder="作品描述"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
              <input
                className={styles.input}
                type="text"
                placeholder="技术信息 / 工具 (可选)"
                value={form.prompt}
                onChange={e => setForm({ ...form, prompt: e.target.value })}
              />
            </div>

            {message && <p className={styles.message}>{message}</p>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "上传中..." : "发布作品"}
            </button>
          </form>
        </section>

        {/* Existing Items */}
        <section className={styles.listSection}>
          <h2>已有作品 ({items.length})</h2>
          <div className={styles.itemGrid}>
            {items.map(item => (
              <div key={item.id} className={styles.itemCard}>
                <img src={item.imageUrl} alt={item.title} className={styles.itemThumb} />
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemCategory}>{item.category}</span>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(item.id)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
