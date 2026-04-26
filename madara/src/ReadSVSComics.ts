import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  PagedResults,
  TagSection,
  Tag,
  SourceTag,
} from "paperback-extensions-common";

export class ReadSVSComics extends Source {
  readonly name = "Read SVSComics";
  readonly baseUrl = "https://read.svscomics.com";
  readonly lang = "en";
  readonly isNsfw = true;

  readonly tags: SourceTag[] = [SourceTag.ADULT];

  // Homepage sections
  async getHomePageSections(): Promise<HomeSection[]> {
    return [
      {
        id: "latest",
        title: "Latest Updates",
        view_more: true,
      },
      {
        id: "3d",
        title: "3D Comics",
        view_more: true,
      },
    ];
  }

  // Latest / Updated list
  async getMangaList(page: number): Promise<PagedResults> {
    const request = {
      url: `${this.baseUrl}/page/${page}/`,
      method: "GET",
    };
    const data = await this.requestManager.schedule(request, 1);
    const $ = this.cheerio.load(data.data);

    const mangas: Manga[] = [];
    // Adjust these selectors after you inspect the site in Safari
    $(".comic-item, .list-item, article").each((_, el) => {
      const title = $(el).find("h3, .title").text().trim() || "Untitled";
      const url = $(el).find("a").attr("href") || "";
      const cover = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
      if (url) {
        mangas.push(createManga({
          id: url.replace(this.baseUrl, "").replace("/", ""),
          title,
          image: cover.startsWith("http") ? cover : this.baseUrl + cover,
        }));
      }
    });

    const hasNext = $(".pagination .next").length > 0; // tweak if needed
    return createPagedResults({
      results: mangas,
      metadata: hasNext ? { page: page + 1 } : undefined,
    });
  }

  // Search
  async searchManga(searchRequest: SearchRequest): Promise<PagedResults> {
    // Site uses /search/ or query param - test and adjust
    const query = encodeURIComponent(searchRequest.title || "");
    const request = { url: `${this.baseUrl}/?s=${query}`, method: "GET" };
    // ... same parsing logic as getMangaList
    // (copy the cheerio block above and return results)
  }

  // Manga details + chapters (most are single-chapter comics)
  async getMangaDetails(mangaId: string): Promise<Manga> {
    const url = `${this.baseUrl}/${mangaId}`;
    const data = await this.requestManager.schedule({ url, method: "GET" }, 1);
    const $ = this.cheerio.load(data.data);

    const title = $("h1").text().trim();
    const artist = $(".artist, .author").text().trim();
    const cover = $("img.cover, .featured-image img").attr("src") || "";

    // Chapters: many comics are single-issue
    const chapters: Chapter[] = [createChapter({
      id: "1",
      name: "Read Online",
      chapNum: 1,
      mangaId: mangaId,
    })];

    return createManga({
      id: mangaId,
      title,
      image: cover,
      artist,
      chapters,
    });
  }

  // Chapter pages (the reader)
  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    const url = `${this.baseUrl}/${mangaId}`;
    const data = await this.requestManager.schedule({ url, method: "GET" }, 1);
    const $ = this.cheerio.load(data.data);

    const pages: string[] = [];
    // Site usually has thumbs + full images - adjust selector
    $(".reader img, .page-image, .comic-page img, .gallery img").each((_, el) => {
      let src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
      if (src) {
        if (!src.startsWith("http")) src = this.baseUrl + src;
        pages.push(src);
      }
    });

    return createChapterDetails({
      id: chapterId,
      mangaId,
      pages,
    });
  }

  // Optional: tags, etc. (add if you want)
}
