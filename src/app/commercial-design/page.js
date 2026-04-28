"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./CommercialDesign.module.css";

const isVideoUrl = (url) => /\.(mp4|webm|mov|m4v|ogg)$/i.test(String(url || "").trim());
const isAudioUrl = (url) => /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(String(url || "").trim());
const toMediaSrc = (url) => encodeURI(String(url || "").trim());

const WECHAT_CSC_MEDIA = Array.from(
  { length: 14 },
  (_, index) => `/media/images/commercial-design/wechat-csc/客服中心${index + 1}.png`
);

const COMMERCIAL_PROJECTS = [
  {
    id: "wechat-cmsc",
    navLabel: "WeChat CMSC",
    date: "2024.01",
    title: "微信支付客服中心人工客服体验改版",
    paragraphs: [
      "微信支付客服中心原先的人工服务需要跳转至外部语音页面接通，这次改版在设计团队和开发的支持下启动，也是我第一次在微信支付团队完整参与并推进落地的全链路项目。项目中同步设计了文字与语音两种客服形态，文字客服先行上线进入灰度测试，语音客服后续逐步开放。",
      "整个体验围绕“联系人工—描述问题—排队等待—客服会话—服务评价”几个关键节点展开。我从需求梳理到方案设计再到链路走查，独立完成了这个需求：通过关键词触发和输入联想降低用户表达成本，以真人头像和工号强化“已接入人工”的感知，并在排队过程中补充状态反馈与自助分流能力，预测将整体效率提升约60%。"
    ],
    media: WECHAT_CSC_MEDIA
  },
  {
    id: "horse-poster-260423",
    navLabel: "马年海报260423",
    date: "2024.02",
    title: "微信支付马年春节商户年历海报设计",
    paragraphs: [
      "马年新春期间，微信支付希望通过更具节庆氛围的品牌视觉触达线下商户场景。此次项目以“支付猫”为核心视觉载体，结合商户年历海报这一传播形式，围绕“春节氛围”与“财源广进”等吉祥寓意，设计面向线下商户的节庆主题视觉方案，并最终上线微信海报中心，供千万商户定制使用。",
      "我从传统“虎头帽”中提取“辟邪纳福”的寓意，并结合马年主题延展出“马头帽”概念，使其与“支付猫”的品牌形象自然融合。在视觉探索阶段，我将手绘草图与 AI 工作流结合，围绕红包、元宝、祥云等关键词进行风格实验，并借助 Gemini Nano Banana 快速生成早期方向与关键帧参考，以更高效地验证创意方向、缩短试错周期。在确认视觉基调后，再结合自绘与资产库素材，对画面元素进行拆解、重构与统一绘制，完成线稿规范与基础视觉搭建，并在 Figma 中手绘调整局部细节，搭建出一套兼顾效率与完成度的实际工作流。"
    ],
    media: ["/media/images/commercial-design/马年海报260423.png"]
  },
  {
    id: "wechat-ai-ip-motion",
    navLabel: "微信经营助手IP",
    date: "2024.03",
    title: "微信经营助手智能体验探索与IP动效设计",
    paragraphs: [
      "微信经营助手作为面向商户的官方智能助手，希望借助“支付猫”进一步建立统一品牌认知。但当前会话场景仍偏传统客服形态，缺乏智能交互感与情绪反馈。本项目围绕智能体验升级与 IP 动效设计展开，以“支付猫”为核心交互载体，探索其在对话场景中的动态化表达，使其从静态视觉符号转化为具备状态与情绪反馈能力的智能 IP。",
      "在与 PM 沟通后，设计从会话结构切入，梳理文本回复、引导问答、跳转链接、图文卡片及加载状态等信息形态，建立基础交互框架，为 IP 在不同场景中的表达提供稳定承载。",
      "在动效实现上，早期尝试手工逐帧制作，但效率较低，且难以保证高频表情与复杂动作切换时的流畅性与一致性。后续转向 AI 生成与后期精修结合的工作流：前期通过生成式视频快速验证“支付猫”在不同语境下的动作逻辑与表情变化，低成本完成多轮方案筛选与方向收敛；再将生成结果拆解为序列帧导入 AE 二次编辑，逐帧修正角色一致性、品牌色偏差等问题，并重构节奏与动作衔接，最终在效率与精度之间取得平衡，形成一套可复用的 IP 动效生产流程"
    ],
    media: ["/media/images/commercial-design/微信经营助手智能体验创新与IP动效设计.png"]
  },
  {
    id: "feishu-pte",
    navLabel: "Feishu PTE",
    date: "2024.04",
    title: "飞书ToB品牌传播与获客视觉设计",
    paragraphs: [
      "在飞书创意设计团队期间，参与ToB品牌传播与获客相关的日常视觉设计工作，覆盖企业手册、招聘Banner、H5页面及多类型线上传播物料。将飞书既有品牌系统持续延展到不同触点场景中，在统一视觉规范的基础上适配多样化传播需求。",
      "工作中一方面参与品牌视觉系统的持续优化与资产库搭建，协助梳理颜色、字体及组件等基础规范，使设计输出能够在不同媒介中保持一致性；另一方面在具体物料设计中，根据不同业务目标调整视觉表达方式，在“品牌统一性”与“传播灵活性”之间寻找平衡。同时结合 ComfyUI 与内部 LoRA 模型，将生成式工具引入日常设计流程，用于辅助B端Banner、内容型页面等物料的视觉探索与快速出图，在提升产出效率的同时，逐步沉淀可复用的AI辅助设计工作流。"
    ],
    media: [
      "/media/images/commercial-design/feishu-pt1/36.png",
      "/media/images/commercial-design/feishu-pt1/Frame 1321318981.png",
      "/media/images/commercial-design/feishu-pt1/for ppt.png",
      "/media/images/commercial-design/feishu-pt1/Frame 2036083845.png",
      "/media/images/commercial-design/feishu-pt1/1774436908953-___bn_3x.png",
      "/media/images/commercial-design/feishu-pt1/d5c024f6f45a65318b9d68d0f3a486b8 1.png"
    ]
  },
  {
    id: "feishu-pte2",
    navLabel: "Feishu PTE2",
    date: "2024.05",
    title: "飞书2024未来无限大会全链路视觉设计",
    paragraphs: [
      "在飞书创意设计团队实习期间，完整参与P0级发布会——飞书 2024 未来无限大会的全链路视觉设计与落地执行。前期团队讨论中与飞书CEO对齐核心关键词“强大”，参与整体视觉方向的发散与讨论，结合前两年发布会视觉体系及行业参考进行分析，对主视觉方向进行草图推演与多方案验证，逐步推动视觉概念的收敛与统一。在此过程中，将飞书 Lark 鸟的品牌符号与“强大”的概念进行结合，通过多版视觉方案探索，最终确立以射线结构、微动效与光效延展为核心的视觉语言体系，作为主视觉表达方向。",
      "在执行阶段，基于已确定的视觉方向延展完成嘉宾证、直播间互动组件、线上挂件及企业周边等多类高密度物料设计，支撑万人级直播场景下的统一视觉呈现。同时参与发布会PPT视觉内容的整理与适配工作，并在项目最终落地阶段参与现场执行与内容调试，跟进大屏播放效果与实际呈现情况，使整体视觉表达从概念到现场呈现保持一致。"
    ],
    media: [
      "/media/images/commercial-design/feishu-pt2/Frame 2036083849.png",
      "/media/images/commercial-design/feishu-pt2/Frame 2036083855.png",
      "/media/images/commercial-design/feishu-pt2/Frame 2036083856.png"
    ]
  }
];

export default function CommercialDesignPage() {
  const [activeProjectId, setActiveProjectId] = useState(COMMERCIAL_PROJECTS[0].id);
  const [spineLeftPx, setSpineLeftPx] = useState(null);
  const sectionRefMap = useRef(new Map());
  const videoRefMap = useRef(new Map());
  const leftPanelRef = useRef(null);
  const rightColumnRef = useRef(null);

  const projects = useMemo(() => COMMERCIAL_PROJECTS, []);

  const updateSpineLeft = useCallback(() => {
    const rightRect = rightColumnRef.current?.getBoundingClientRect();
    if (!rightRect) return;
    if (!Number.isFinite(rightRect.left)) return;
    const scrollbarCompensation = Math.max(0, window.innerWidth - document.documentElement.clientWidth) / 2;
    setSpineLeftPx(rightRect.left + scrollbarCompensation);
  }, []);

  useEffect(() => {
    const headerNodes = Array.from(document.querySelectorAll(".logo-area, .nav")).filter(
      (node) => node instanceof HTMLElement
    );
    if (headerNodes.length === 0) return;

    let hidden = false;
    let lastScrollTop = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop);
    let frame = 0;

    const setHidden = (nextHidden) => {
      if (hidden === nextHidden) return;
      hidden = nextHidden;
      headerNodes.forEach((node) => {
        node.style.opacity = nextHidden ? "0" : "1";
        node.style.transform = nextHidden ? "translate3d(0, -40px, 0)" : "translate3d(0, 0, 0)";
        node.style.pointerEvents = nextHidden ? "none" : "auto";
      });
    };

    const applyByScrollDirection = () => {
      const scrollTop = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop);
      const delta = scrollTop - lastScrollTop;
      if (scrollTop <= 8) {
        setHidden(false);
      } else if (delta > 1.2) {
        setHidden(true);
      } else if (delta < -1.2) {
        setHidden(false);
      }
      lastScrollTop = scrollTop;
      frame = 0;
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(applyByScrollDirection);
    };

    headerNodes.forEach((node) => {
      node.style.transition = "transform 560ms cubic-bezier(0.22, 1, 0.36, 1), opacity 560ms cubic-bezier(0.22, 1, 0.36, 1)";
      node.style.willChange = "transform, opacity";
    });
    setHidden(false);

    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, true);
      headerNodes.forEach((node) => {
        node.style.opacity = "";
        node.style.transform = "";
        node.style.pointerEvents = "";
        node.style.transition = "";
        node.style.willChange = "";
      });
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const nextId = String(entry.target.getAttribute("data-project-id") || "");
          if (nextId) setActiveProjectId(nextId);
        });
      },
      {
        root: null,
        rootMargin: "-45% 0px -45% 0px",
        threshold: 0
      }
    );

    sectionRefMap.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!(video instanceof HTMLVideoElement)) return;

          if (entry.isIntersecting) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {});
            }
            return;
          }

          video.pause();
          try {
            video.currentTime = 0;
          } catch {}
        });
      },
      {
        root: null,
        rootMargin: "-12% 0px -12% 0px",
        threshold: 0.35
      }
    );

    videoRefMap.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateSpineLeft);
    };
    schedule();

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      if (leftPanelRef.current) observer.observe(leftPanelRef.current);
      if (rightColumnRef.current) observer.observe(rightColumnRef.current);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      if (observer) observer.disconnect();
    };
  }, [updateSpineLeft, activeProjectId]);

  const setSectionRef = useCallback((projectId, node) => {
    if (!projectId) return;
    if (node) {
      sectionRefMap.current.set(projectId, node);
    } else {
      sectionRefMap.current.delete(projectId);
    }
  }, []);

  const setVideoRef = useCallback((mediaKey, node) => {
    if (!mediaKey) return;
    if (node) {
      videoRefMap.current.set(mediaKey, node);
    } else {
      videoRefMap.current.delete(mediaKey);
    }
  }, []);

  const jumpToProject = useCallback((projectId, behavior = "smooth") => {
    const target = sectionRefMap.current.get(projectId);
    if (!target) return;
    setActiveProjectId(projectId);
    target.scrollIntoView({ behavior, block: "start" });
  }, []);

  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0];

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedProjectId = searchParams.get("project");
    const hashTarget = decodeURIComponent(window.location.hash || "")
      .replace(/^#project-/, "")
      .trim();
    const nextProjectId = requestedProjectId || hashTarget;
    if (!nextProjectId) return;
    if (!projects.some((project) => project.id === nextProjectId)) return;

    const frame = window.requestAnimationFrame(() => {
      jumpToProject(nextProjectId, "auto");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [jumpToProject, projects]);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.spineOverlayContainer} aria-hidden="true">
        <img
          src="/ui/crease-multiply2.png"
          alt=""
          className={styles.spineMultiply}
          style={spineLeftPx !== null ? { left: `${spineLeftPx}px` } : undefined}
          draggable="false"
        />
      </div>

      <div className={styles.layout}>
        <aside className={styles.navRail} aria-label="Project navigation">
          <div className={styles.navInner}>
            {projects.map((project, index) => (
              <button
                key={project.id}
                type="button"
                className={`${styles.navItem} ${activeProject.id === project.id ? styles.navItemActive : ""}`}
                onClick={() => jumpToProject(project.id)}
              >
                <span className={styles.navIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.navLabel}>{project.navLabel}</span>
              </button>
            ))}
          </div>
        </aside>

        <aside ref={leftPanelRef} className={styles.leftPanel}>
          <div className={styles.leftPanelInner}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeProject.id}
                className={styles.projectMetaMotion}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -22 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className={styles.kicker}>{activeProject.date}</p>
                <h2 className={styles.projectTitle}>{activeProject.title}</h2>
                <div className={styles.projectCopy}>
                  {activeProject.paragraphs.map((paragraph, idx) => (
                    <p key={`${paragraph}-${idx}`}>{paragraph}</p>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>

        <main ref={rightColumnRef} className={styles.rightColumn}>
          {projects.map((project, projectIndex) => {
            const nextProject = projects[projectIndex + 1];
            const transitionId = nextProject ? `${project.id}-to-${nextProject.id}` : "";

            return (
              <Fragment key={project.id}>
                <section
                  ref={(node) => setSectionRef(project.id, node)}
                  data-project-id={project.id}
                  id={`project-${project.id}`}
                  className={styles.projectSection}
                >
                  <div className={styles.projectMediaStack}>
                    {project.media.map((url, index) => {
                      const src = toMediaSrc(url);
                      const mediaKey = `${project.id}-${index}-${src}`;
                      if (isVideoUrl(src)) {
                        return (
                          <video
                            ref={(node) => setVideoRef(mediaKey, node)}
                            key={mediaKey}
                            src={src}
                            className={styles.projectVideo}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                          />
                        );
                      }

                      if (isAudioUrl(src)) {
                        return (
                          <div key={mediaKey} className={styles.audioWrap}>
                            <audio src={src} controls className={styles.projectAudio} />
                          </div>
                        );
                      }

                      return <img key={mediaKey} src={src} alt={project.title} className={styles.projectImage} />;
                    })}

                    {project.id === "wechat-ai-ip-motion" ? (
                      <>
                        <video
                          ref={(node) => setVideoRef(`${project.id}-cat-hello`, node)}
                          key={`${project.id}-cat-hello`}
                          src="/media/videos/cat-hello.mp4"
                          className={styles.projectVideo}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                        <video
                          ref={(node) => setVideoRef(`${project.id}-payment-cat`, node)}
                          key={`${project.id}-payment-cat`}
                          src="/media/videos/客服支付猫动态.mp4"
                          className={styles.projectVideo}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      </>
                    ) : null}

                    {project.id === "wechat-cmsc" ? (
                      <video
                        ref={(node) => setVideoRef(`${project.id}-service-rating`, node)}
                        key={`${project.id}-service-rating`}
                        src="/media/videos/客服中心人工客服评价.mp4"
                        className={styles.projectVideo}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                    ) : null}
                  </div>
                </section>

                {nextProject ? (
                  <div
                    className={styles.projectTransition}
                    aria-hidden="true"
                  />
                ) : null}
              </Fragment>
            );
          })}
        </main>
      </div>
    </div>
  );
}
