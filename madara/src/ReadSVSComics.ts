import { Source, Manga, Chapter, ChapterDetails, HomeSection, SearchRequest, PagedResults, SourceTag } from "paperback-extensions-common";

export class ReadSVSComics extends Source {
  readonly name = "Read SVSComics";
  readonly baseUrl = "https://read.svscomics.com";
  readonly lang = "en";
  readonly isNsfw = true;
  readonly tags: SourceTag[] = [SourceTag.ADULT];

  async getMangaList(page: number) {
    const req = { url: `${this.baseUrl}/page/${page}/`, method: "GET" };
    const data = await this.requestManager.schedule(req, 1);
    const $ = this.cheerio.load(data.data);
    const mangas = [];
    $(".comic, article, .post, .item").each((_, el) => {  // ← if this doesn’t work later, we’ll fix it together
      const title = $(el).find("h3, .title").text().trim() || "Cute Comic";
      const url = $(el).find("a").attr("href") || "";
      const cover = $(el).find("img").attr("src") || "";
      if (url) mangas.push(createManga({ id: url.split("/").pop(), title, image: cover }));
    });
    return createPagedResults({ results: mangas });
  }

  async getMangaDetails(mangaId) {
    const url = `${this.baseUrl}/${mangaId}`;
    const data = await this.requestManager.schedule({ url, method: "GET" }, 1);
    const $ = this.cheerio.load(data.data);
    return createManga({
      id: mangaId,
      title: $("h1").text().trim(),
      image: $("img").first().attr("src"),
      chapters: [createChapter({ id: "1", name: "Read it baby 💕", chapNum: 1, mangaId })]
    });
  }

  async getChapterDetails(mangaId) {
    const url = `${this.baseUrl}/${mangaId}`;
    const data = await this.requestManager.schedule({ url, method: "GET" }, 1);
    const $ = this.cheerio.load(data.data);
    const pages = [];
    $(".reader img, .page img, img").each((_, el) => {
      let src = $(el).attr("src") || $(el).attr("data-src");
      if (src) pages.push(src.startsWith("http") ? src : this.baseUrl + src);
    });
    return createChapterDetails({ id: "1", mangaId, pages });
  }
}
