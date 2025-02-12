import { Game } from "@main/entity";
import { Downloader } from "/home/pedro/hydra/src/shared/index";
import { PythonInstance } from "./python-instance";
import { WindowManager } from "../window-manager";
import { downloadQueueRepository, gameRepository } from "@main/repository";
import { publishDownloadCompleteNotification } from "../notifications";
import { RealDebridDownloader } from "./real-debrid-downloader";
import type { DownloadProgress } from "/home/pedro/hydra/src/types/index";
import { GofileApi, QiwiApi } from "../hosters";
import { GenericHttpDownloader } from "./generic-http-downloader";

export class DownloadManager {
  private static currentDownloader: Downloader | null = null;
  private static downloadingGameId: number | null = null;

  public static async watchDownloads() {
    let status: DownloadProgress | null = null;

    if (this.currentDownloader === Downloader.Torrent) {
      status = await PythonInstance.getStatus();
    } else if (this.currentDownloader === Downloader.RealDebrid) {
      status = await RealDebridDownloader.getStatus();
    } else {
      status = await GenericHttpDownloader.getStatus();
    }

    if (status) {
      const { gameId, progress } = status;

      const game = await gameRepository.findOne({
        where: { id: gameId, isDeleted: false },
      });

      if (WindowManager.mainWindow && game) {
        WindowManager.mainWindow.setProgressBar(progress === 1 ? -1 : progress);

        WindowManager.mainWindow.webContents.send(
          "on-download-progress",
          JSON.parse(
            JSON.stringify({
              ...status,
              game,
            })
          )
        );
      }

      if (progress === 1 && game) {
        publishDownloadCompleteNotification(game);

        await downloadQueueRepository.delete({ game });

        const [nextQueueItem] = await downloadQueueRepository.find({
          order: {
            id: "DESC",
          },
          relations: {
            game: true,
          },
        });

        if (nextQueueItem) {
          this.resumeDownload(nextQueueItem.game);
        }
      }
    }
  }

  static async pauseDownload() {
    if (this.currentDownloader === Downloader.Torrent) {
      await PythonInstance.pauseDownload();
    } else if (this.currentDownloader === Downloader.RealDebrid) {
      await RealDebridDownloader.pauseDownload();
    } else {
      await GenericHttpDownloader.pauseDownload();
    }

    WindowManager.mainWindow?.setProgressBar(-1);
    this.currentDownloader = null;
    this.downloadingGameId = null;
  }

  static async resumeDownload(game: Game) {
    return this.startDownload(game);
  }

  static async cancelDownload(gameId = this.downloadingGameId!) {
    if (this.currentDownloader === Downloader.Torrent) {
      PythonInstance.cancelDownload(gameId);
    } else if (this.currentDownloader === Downloader.RealDebrid) {
      RealDebridDownloader.cancelDownload(gameId);
    } else {
      GenericHttpDownloader.cancelDownload(gameId);
    }

    WindowManager.mainWindow?.setProgressBar(-1);
    this.currentDownloader = null;
    this.downloadingGameId = null;
  }

  static async startDownload(game: Game) {
    //  Limpa a fila de downloads antes de adicionar um novo jogo
    await downloadQueueRepository.delete({});
    await downloadQueueRepository.save({ game });

    switch (game.downloader) {
      case Downloader.Gofile: {
        const id = game!.uri!.split("/").pop();
        const token = await GofileApi.authorize();
        const downloadLink = await GofileApi.getDownloadLink(id!);

        GenericHttpDownloader.startDownload(game, downloadLink, {
          Cookie: `accountToken=${token}`,
        });
        break;
      }
      case Downloader.PixelDrain: {
        const id = game!.uri!.split("/").pop();
        await GenericHttpDownloader.startDownload(
          game,
          `https://pixeldrain.com/api/file/${id}?download`
        );
        break;
      }
      case Downloader.Qiwi: {
        const downloadUrl = await QiwiApi.getDownloadUrl(game.uri!);
        await GenericHttpDownloader.startDownload(game, downloadUrl);
        break;
      }
      case Downloader.Torrent:
        PythonInstance.startDownload(game);
        break;
      case Downloader.RealDebrid:
        RealDebridDownloader.startDownload(game);
        break;
    }

    this.currentDownloader = game.downloader;
    this.downloadingGameId = game.id;
}


 
  }

