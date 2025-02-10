import { DownloadManager } from "../download-manager";
import { Game } from "/home/pedro/hydra/src/main/entity/index";
import { Downloader } from "/home/pedro/hydra/src/shared/index";
import { PythonInstance } from "../python-instance";
import { RealDebridDownloader } from "../real-debrid-downloader";
import { GenericHttpDownloader } from "../generic-http-downloader";
import { downloadQueueRepository } from "@main/repository";

// Mock das dependências
jest.mock("../python-instance");
jest.mock("../real-debrid-downloader");
jest.mock("../generic-http-downloader");
jest.mock("/home/pedro/hydra/src/main/entity/index");

describe("DownloadManager", () => {
  afterEach(() => {
    jest.clearAllMocks(); // Limpa os mocks após cada teste
  });

  it("should start a torrent download when downloader is Torrent", async () => {
    const game = {
      id: 1,
      downloader: Downloader.Torrent,
      uri: "magnet:?xt=urn:btih:example",
    } as Game;

    await DownloadManager.startDownload(game);

    expect(PythonInstance.startDownload).toHaveBeenCalledWith(game);
    expect(downloadQueueRepository.delete).toHaveBeenCalledWith({});
    expect(downloadQueueRepository.save).toHaveBeenCalledWith({ game });
  });

  it("should start a RealDebrid download when downloader is RealDebrid", async () => {
    const game = {
      id: 2,
      downloader: Downloader.RealDebrid,
      uri: "https://realdebrid.com/example",
    } as Game;

    await DownloadManager.startDownload(game);

    expect(RealDebridDownloader.startDownload).toHaveBeenCalledWith(game);
    expect(downloadQueueRepository.delete).toHaveBeenCalledWith({});
    expect(downloadQueueRepository.save).toHaveBeenCalledWith({ game });
  });

  it("should start a HTTP download when downloader is Gofile", async () => {
    const game = {
      id: 3,
      downloader: Downloader.Gofile,
      uri: "https://gofile.io/example",
    } as Game;

    await DownloadManager.startDownload(game);

    expect(GenericHttpDownloader.startDownload).toHaveBeenCalled();
    expect(downloadQueueRepository.delete).toHaveBeenCalledWith({});
    expect(downloadQueueRepository.save).toHaveBeenCalledWith({ game });
  });
});